import { readLocalObject } from "@/lib/services/storage.service";
import { jsonError } from "@/lib/api/http";

/** Serve locally stored uploads (dev / non-S3). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return jsonError(400, "key is required");

  const buf = await readLocalObject(key);
  if (!buf) return jsonError(404, "Not found");

  const ext = key.split(".").pop()?.toLowerCase();
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "pdf"
          ? "application/pdf"
          : "image/jpeg";

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
