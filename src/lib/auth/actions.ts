"use server";

import { redirect } from "next/navigation";
import {
  findCredentialByUsername,
  verifyPassword,
} from "@/lib/auth/credentials";
import {
  clearSessionCookie,
  createSessionToken,
  sessionUserFromId,
  setSessionCookie,
} from "@/lib/auth/session";

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

  const cred = findCredentialByUsername(username);
  if (!cred || !(await verifyPassword(password, cred.passwordHash))) {
    return { ok: false, error: "Username or password not recognised." };
  }

  const user = sessionUserFromId(cred.id);
  if (!user) {
    return { ok: false, error: "Username or password not recognised." };
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);

  // Post-login lands on My Profile (prototype deliberate asymmetry).
  redirect("/profile");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function switchUserAction() {
  await clearSessionCookie();
  redirect("/login");
}
