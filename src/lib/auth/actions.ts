"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    // Next.js redirect throws; rethrow
    throw err;
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
      session.authUserId,
      password,
      confirm,
      session.username,
    );
    redirect("/dashboard");
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
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
  await skipPasswordChange(session.authUserId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login");
}

export async function switchUserAction() {
  await destroyCurrentSession();
  redirect("/login");
}

/** Clear cookie without DB (edge cases). Prefer logoutAction. */
export async function forceClearSessionAction() {
  await clearSessionCookie();
  redirect("/login");
}
