import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { putLocalObject } from "@/lib/services/storage.service";
import { ServiceError } from "@/lib/db/service";

/** Local-dev upload endpoint used when S3 is not configured. */
export async function PUT(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    const token = url.searchParams.get("token");
    if (!key || !token) {
      throw new ServiceError(400, "key and token are required");
    }

    const contentLength = Number(req.headers.get("content-length")) || 0;
    if (contentLength > 10 * 1024 * 1024) {
      throw new ServiceError(400, "File too large");
    }

    await putLocalObject(key, req.body, token, session.id);
    return jsonOk({ ok: true, key });
  } catch (err) {
    return handleServiceError(err);
  }
}
