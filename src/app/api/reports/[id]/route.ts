import { buildActivityReportHTML } from "@/lib/reports/buildReport";
import { createNow } from "@/lib/dates";
import {
  getActivity,
  getActivityComments,
  getActivityLogs,
  listResponsibilities,
  listUsers,
} from "@/lib/db/service";
import {
  handleServiceError,
  jsonError,
  requireSession,
} from "@/lib/api/http";
import { recordAuditEvent } from "@/lib/services/audit.service";
import type { TrakDb } from "@/lib/types";

/**
 * Server-side activity report as Word-compatible HTML (.doc).
 * GET /api/reports/[id]?format=doc|html
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;

    const act = await getActivity(session, id);
    if (!act) return jsonError(404, "Activity not found");

    const [dailyLogs, comments, users, responsibilities] = await Promise.all([
      getActivityLogs(session, id),
      getActivityComments(session, id),
      listUsers(),
      listResponsibilities(),
    ]);

    const db: TrakDb = {
      activities: [act],
      dailyLogs,
      comments,
      dms: [],
      calls: [],
      community: [],
      broadcasts: [],
      notifications: [],
    };

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const html = buildActivityReportHTML(
      act,
      db,
      userMap,
      responsibilities,
      createNow(),
    );

    await recordAuditEvent({
      userId: session.authUserId,
      action: "report_generate",
      targetId: id,
      targetType: "activity",
    });

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "doc";

    if (format === "html") {
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const memberName = userMap[act.createdBy]?.name || "Unknown";
    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = `${memberName} - Activity Report - ${dateStr}`
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim()
      .slice(0, 100);
    const blob = `\ufeff${html}`;
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.doc"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
