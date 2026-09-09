import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { listManageResources } from "@/lib/library/service";
import type { LibraryCategory, LibraryStatus } from "@/lib/types";

const CATEGORIES = new Set(["ALL", "BOOK", "VIDEO", "AUDIO", "MEMO", "OTHER"]);
const STATUSES = new Set(["ALL", "PENDING", "APPROVED", "DECLINED"]);
const SORTS = new Set(["name-asc", "name-desc", "newest", "oldest"]);

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const search = (url.searchParams.get("search") || "").slice(0, 200);
    const categoryRaw = (url.searchParams.get("category") || "ALL").toUpperCase();
    const statusRaw = (url.searchParams.get("status") || "ALL").toUpperCase();
    const sortRaw = (url.searchParams.get("sort") || "newest").toLowerCase();
    const category = (CATEGORIES.has(categoryRaw) ? categoryRaw : "ALL") as LibraryCategory | "ALL";
    const status = (STATUSES.has(statusRaw) ? statusRaw : "ALL") as LibraryStatus | "ALL";
    const sort = (SORTS.has(sortRaw) ? sortRaw : "newest") as
      | "name-asc"
      | "name-desc"
      | "newest"
      | "oldest";

    const { resources, total } = await listManageResources(session, {
      search,
      category,
      status,
      sort,
      page,
      limit,
    });
    return jsonOk({ resources, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}
