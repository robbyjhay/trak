"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  login as authLogin,
  setInitialPassword,
  skipPasswordChange,
  AuthError,
} from "@/lib/services/auth.service";
import {
  clearSessionCookie,
  destroyCurrentSession,
  readSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getEnv, isDevLoginEnabled } from "@/lib/env";
import { log } from "@/lib/log";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAction(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { ok: false, error: "Username or password not recognised." };
  }

  const env = getEnv();
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const limit = await checkRateLimit(
    `login:${ip}:${username.toLowerCase()}`,
    env.RATE_LIMIT_LOGIN_MAX,
    env.RATE_LIMIT_LOGIN_WINDOW_SEC,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many login attempts. Please try again later.",
    };
  }

  try {
    const result = await authLogin(username, password, {
      ip,
      userAgent: h.get("user-agent"),
    });
    await setSessionCookie(result.rawToken);

    if (result.mustChangePassword) {
      redirect("/set-password");
    }
    redirect("/dashboard");
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return { ok: false, error: err.message };
    }
    // Next.js redirect()/notFound() must propagate; do not swallow.
    unstable_rethrow(err);
    log.error("login_action_unexpected", err, { username });
    // DB/timeouts/etc. — fail closed with a safe message (no internals).
    return {
      ok: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}

export type SetPasswordResult = LoginResult;

/** First-login forced password set (server action). */
export async function setNewPasswordAction(
  _prev: SetPasswordResult | null,
  formData: FormData,
): Promise<SetPasswordResult> {
  const session = await readSession();
  if (!session) redirect("/login");

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  try {
    await setInitialPassword(
      session.authUserId || session.id,
      password,
      confirm,
      session.username,
    );
    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return { ok: false, error: err.message };
    }
    unstable_rethrow(err);
    throw err;
  }
}

/**
 * "Skip for now" — clears mustChangePassword without changing password.
 * Production: always blocked. Dev: only when ENABLE_DEV_LOGIN=true.
 */
export async function skipPasswordChangeAction(): Promise<void> {
  if (!isDevLoginEnabled()) {
    redirect("/set-password");
  }
  const session = await readSession();
  if (!session) redirect("/login");
  const userId = session.authUserId || session.id;
  await skipPasswordChange(userId);
  // Bust cached layout session gate so dashboard does not bounce back to set-password.
  revalidatePath("/", "layout");
  revalidatePath("/set-password");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function switchUserAction() {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Clear cookie without DB (edge cases). Prefer logoutAction. */
export async function forceClearSessionAction() {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}

import { setDefaultMemberPassword } from "@/lib/services/settings.service";
import { validatePasswordPolicy, passwordPolicyMessage } from "@/lib/auth/password";

export async function updateDefaultPasswordAction(_prev: any, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await readSession();
  if (!session || session.role !== "head") {
    return { ok: false, error: "Unauthorized" };
  }

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  const policyError = validatePasswordPolicy(password, { confirm });
  if (policyError) {
    return { ok: false, error: passwordPolicyMessage(policyError) };
  }

  try {
    await setDefaultMemberPassword(password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "An unexpected error occurred." };
  }
}

import { resetMemberPassword } from "@/lib/services/auth.service";

export async function resetMemberPasswordAction(userId: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  const session = await readSession();
  if (!session || session.role !== "head") {
    return { ok: false, error: "Unauthorized" };
  }
  
  try {
    const defaultPass = await resetMemberPassword(userId, session.id);
    return { ok: true, password: defaultPass };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "An unexpected error occurred." };
  }
}
