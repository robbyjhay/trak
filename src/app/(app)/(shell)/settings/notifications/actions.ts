"use server";

import { readSession } from "@/lib/auth/session";
import { updateUserPreferences } from "@/lib/services/user-preferences.service";
import { revalidatePath } from "next/cache";

export async function updatePreferencesAction(_prev: any, formData: FormData) {
  const session = await readSession();
  if (!session) return { ok: false, error: "Unauthorized" };

  const notificationsEnabled = formData.get("notificationsEnabled") === "on";
  const dmNotifications = formData.get("dmNotifications") === "on";
  const broadcastNotifications = formData.get("broadcastNotifications") === "on";
  const activityNotifications = formData.get("activityNotifications") === "on";
  // Note: emailNotifications is included but currently has no backend effect.
  const emailNotifications = formData.get("emailNotifications") === "on";

  try {
    await updateUserPreferences(session.id, {
      notificationsEnabled,
      dmNotifications,
      broadcastNotifications,
      activityNotifications,
      emailNotifications,
    });
    
    // Also record audit event
    const { recordAuditEvent } = await import("@/lib/services/audit.service");
    await recordAuditEvent({
      userId: session.id,
      action: "settings_change",
      targetId: session.id,
      targetType: "user_preferences",
    });

    revalidatePath("/settings/notifications");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: "Failed to update preferences." };
  }
}
