import { buildActivityReportHTML } from "@/lib/reports/buildReport";
import { createNow } from "@/lib/dates";
import { getSnapshot } from "@/lib/db/store";
import {
  handleServiceError,
  jsonError,
  requireSession,
} from "@/lib/api/http";

/**
 * Server-side activity report as Word-compatible HTML (.doc).
 * GET /api/reports/[id]?format=doc|html
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const snap = await getSnapshot();
    const act = snap.db.activities.find((a) => a.id === id);
    if (!act) return jsonError(404, "Activity not found");

    const userMap = Object.fromEntries(snap.users.map((u) => [u.id, u]));
    const html = buildActivityReportHTML(
      act,
      snap.db,
      userMap,
      createNow(),
    );

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "doc";

    if (format === "html") {
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const safeName = act.title
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim()
      .slice(0, 80);
    const blob = `\ufeff${html}`;
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="Trak Activity Report — ${safeName}.doc"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
