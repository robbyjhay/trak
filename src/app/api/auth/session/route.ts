import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, handleServiceError } from "@/lib/api/http";

/**
 * GET /api/auth/session — current user + mustChangePassword + prefs summary.
 */
export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError(401, "Unauthorized");
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.authUserId },
      select: {
        notificationsEnabled: true,
        emailNotifications: true,
        dmNotifications: true,
        broadcastNotifications: true,
        activityNotifications: true,
        locale: true,
        timezone: true,
      },
    });

    return jsonOk({
      user: {
        id: session.id,
        authUserId: session.authUserId,
        name: session.name,
        username: session.username,
        role: session.role,
        isSecretary: session.isSecretary,
        isCorps: session.isCorps,
        mustChangePassword: session.mustChangePassword,
      },
      preferences: prefs,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
