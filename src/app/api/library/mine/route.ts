import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { listMySubmissions } from "@/lib/library/service";

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { resources, total } = await listMySubmissions(session, { page, limit });
    return jsonOk({ resources, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}
