"use server";

import { readSession, getSessionToken } from "@/lib/auth/session";
import { changePassword, validateSession } from "@/lib/services/auth.service";
import { revokeSessionById } from "@/lib/services/user-sessions.service";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(_prev: any, formData: FormData) {
  const token = await getSessionToken();
  const sessionFull = token ? await validateSession(token) : null;
  if (!sessionFull) return { ok: false, error: "Unauthorized" };

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "All fields are required." };
  }

  try {
    await changePassword(sessionFull.user.id, currentPassword, newPassword, confirmPassword, {
      revokeOthers: false,
      currentSessionId: sessionFull.sessionId,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to change password." };
  }
}

export async function revokeSessionAction(sessionIdToRevoke: string) {
  const token = await getSessionToken();
  const sessionFull = token ? await validateSession(token) : null;
  if (!sessionFull) return { ok: false, error: "Unauthorized" };

  if (sessionIdToRevoke === sessionFull.sessionId) {
    return { ok: false, error: "Cannot revoke current session." };
  }

  try {
    await revokeSessionById(sessionFull.user.id, sessionIdToRevoke);
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: "Failed to revoke session." };
  }
}
