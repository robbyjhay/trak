import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import {
  listApprovedResources,
  submitLibraryResource,
} from "@/lib/library/service";
import { ServiceError } from "@/lib/db/service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { LibraryCategory } from "@/lib/types";

const CATEGORIES = new Set(["ALL", "BOOK", "VIDEO", "AUDIO", "MEMO", "OTHER"]);
const SORTS = new Set(["name-asc", "name-desc", "newest", "oldest"]);

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const search = (url.searchParams.get("search") || "").slice(0, 200);
    const categoryRaw = (url.searchParams.get("category") || "ALL").toUpperCase();
    const sortRaw = (url.searchParams.get("sort") || "newest").toLowerCase();
    const category = (CATEGORIES.has(categoryRaw) ? categoryRaw : "ALL") as LibraryCategory | "ALL";
    const sort = (SORTS.has(sortRaw) ? sortRaw : "newest") as
      | "name-asc"
      | "name-desc"
      | "newest"
      | "oldest";

    const { resources, total } = await listApprovedResources(session, {
      search,
      category,
      sort,
      page,
      limit,
    });
    return jsonOk({ resources, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`library:${session.id}`, 20, 3600);
    if (!rl.allowed) {
      throw new ServiceError(429, "Submission rate limit exceeded. Try again later.");
    }

    const body = await parseJsonBody<{
      title?: string;
      category?: string;
      description?: string;
      externalUrl?: string;
      thumbnailKey?: string | null;
    }>(req);

    const resource = await submitLibraryResource(session, body);
    return jsonOk({ resource });
  } catch (err) {
    return handleServiceError(err);
  }
}
