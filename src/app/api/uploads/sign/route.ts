import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  createSignedUpload,
  StorageError,
  type UploadPurpose,
} from "@/lib/services/storage.service";
import { ServiceError } from "@/lib/db/service";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`upload:${session.id}`, 30, 3600);
    if (!rl.allowed) {
      throw new ServiceError(429, "Upload rate limit exceeded.");
    }

    const body = await parseJsonBody<{
      purpose?: UploadPurpose;
      contentType?: string;
      filename?: string;
      size?: number;
    }>(req);

    if (!body.purpose || !body.contentType || body.size == null) {
      throw new ServiceError(
        400,
        "purpose, contentType, and size are required",
      );
    }

    const signed = await createSignedUpload({
      purpose: body.purpose,
      contentType: body.contentType,
      filename: body.filename,
      size: body.size,
      userId: session.id,
    });

    return jsonOk(signed);
  } catch (err) {
    if (err instanceof StorageError) {
      return handleServiceError(new ServiceError(err.status, err.message));
    }
    return handleServiceError(err);
  }
}
