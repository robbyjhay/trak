import { handleServiceError, jsonOk, requireSession } from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { listManageInnovations } from "@/lib/innovation/service";
import type { InnovationCategory, InnovationStatus } from "@/lib/types";

const CATEGORIES = new Set([
  "ALL",
  "PROCESS",
  "TECHNOLOGY",
  "COMMUNITY",
  "TRAINING",
  "COMMUNICATION",
  "OTHER",
]);
const STATUSES = new Set(["ALL", "PENDING", "APPROVED", "IMPLEMENTED", "DECLINED"]);
const SORTS = new Set(["name-asc", "name-desc", "newest", "oldest"]);

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const search = (url.searchParams.get("search") || "").slice(0, 200);
    const categoryRaw = (
      url.searchParams.get("category") || "ALL"
    ).toUpperCase();
    const statusRaw = (
      url.searchParams.get("status") || "ALL"
    ).toUpperCase();
    const sortRaw = (url.searchParams.get("sort") || "newest").toLowerCase();
    const category = (
      CATEGORIES.has(categoryRaw) ? categoryRaw : "ALL"
    ) as InnovationCategory | "ALL";
    const status = (
      STATUSES.has(statusRaw) ? statusRaw : "ALL"
    ) as InnovationStatus | "ALL";
    const sort = (SORTS.has(sortRaw) ? sortRaw : "newest") as
      | "name-asc"
      | "name-desc"
      | "newest"
      | "oldest";

    const { innovations, total } = await listManageInnovations(session, {
      search,
      category,
      status,
      sort,
      page,
      limit,
    });
    return jsonOk({ innovations, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}
