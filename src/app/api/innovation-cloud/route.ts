import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import {
  listApprovedInnovations,
  submitInnovation,
} from "@/lib/innovation/service";
import { ServiceError } from "@/lib/db/service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { InnovationCategory } from "@/lib/types";

const CATEGORIES = new Set([
  "ALL",
  "PROCESS",
  "TECHNOLOGY",
  "COMMUNITY",
  "TRAINING",
  "COMMUNICATION",
  "OTHER",
]);
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
    const sortRaw = (url.searchParams.get("sort") || "newest").toLowerCase();
    const category = (
      CATEGORIES.has(categoryRaw) ? categoryRaw : "ALL"
    ) as InnovationCategory | "ALL";
    const sort = (SORTS.has(sortRaw) ? sortRaw : "newest") as
      | "name-asc"
      | "name-desc"
      | "newest"
      | "oldest";

    const { innovations, total } = await listApprovedInnovations(session, {
      search,
      category,
      sort,
      page,
      limit,
    });
    return jsonOk({ innovations, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`innovation:${session.id}`, 20, 3600);
    if (!rl.allowed) {
      throw new ServiceError(429, "Submission rate limit exceeded. Try again later.");
    }

    const body = await parseJsonBody<{
      title?: string;
      category?: string;
      description?: string;
      details?: string;
    }>(req);

    const innovation = await submitInnovation(session, body);
    return jsonOk({ innovation });
  } catch (err) {
    return handleServiceError(err);
  }
}
