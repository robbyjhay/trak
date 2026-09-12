import { handleServiceError, jsonOk, requireSession } from "@/lib/api/http";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { listMyInnovations } from "@/lib/innovation/service";

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { innovations, total } = await listMyInnovations(session, {
      page,
      limit,
    });
    return jsonOk({ innovations, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}
