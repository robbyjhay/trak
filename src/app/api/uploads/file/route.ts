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
  let type = "image/jpeg";
  if (ext === "png") type = "image/png";
  else if (ext === "webp") type = "image/webp";
  else if (ext === "pdf") type = "application/pdf";
  else if (ext === "doc") type = "application/msword";
  else if (ext === "docx") type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (ext === "xls") type = "application/vnd.ms-excel";
  else if (ext === "xlsx") type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  else if (ext === "ppt") type = "application/vnd.ms-powerpoint";
  else if (ext === "pptx") type = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  else if (ext === "txt") type = "text/plain";
  else if (ext === "csv") type = "text/csv";
  else if (ext === "zip") type = "application/zip";
  else if (ext !== "jpg" && ext !== "jpeg") type = "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
