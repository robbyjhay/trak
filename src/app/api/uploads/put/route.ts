import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { putLocalObject } from "@/lib/services/storage.service";
import { ServiceError } from "@/lib/db/service";

/** App-server upload proxy used in all environments (forwards to S3 in
 * production; local disk for development/test). Browser uploads always land
 * here so they never depend on the client's network reaching the object store
 * or on the bucket's CORS configuration. */
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
    if (contentLength > 30 * 1024 * 1024) {
      throw new ServiceError(413, "File too large");
    }

    await putLocalObject(
      key,
      req.body,
      token,
      session.id,
      req.headers.get("content-type") || undefined,
    );
    return jsonOk({ ok: true, key });
  } catch (err) {
    return handleServiceError(err);
  }
}
