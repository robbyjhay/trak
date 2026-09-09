import { readLocalObject, isS3Configured } from "@/lib/services/storage.service";
import { jsonError } from "@/lib/api/http";
import { requireSession } from "@/lib/api/http";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic"; // Ensure it's not statically evaluated

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return jsonError(400, "key is required");
  
  if (key.includes("..") || key.startsWith("/")) {
    return jsonError(400, "Invalid key");
  }

  // Authorize
  const parts = key.split("/");
  const purpose = parts[0];
  const uploaderId = parts[1];

  let authorized = false;
  if (purpose === "avatar") {
    authorized = true;
  } else if (purpose === "library_thumbnail") {
    // Approved Library resources are visible to every member; thumbnails
    // inherit that visibility. Any authenticated user may read them.
    const { session, error } = await requireSession();
    if (!error && session) {
      const reader = await prisma.user.findUnique({
        where: { id: session.id },
        select: { isActive: true },
      });
      authorized = Boolean(reader?.isActive);
    }
  } else {
    const { session, error } = await requireSession();
    if (error) {
      return jsonError(401, "Unauthorized");
    }
    
    if (session.id === uploaderId) {
      authorized = true;
    } else {
      const user = await prisma.user.findUnique({ where: { id: session.id } });
      if (user && user.isActive) {
        if (purpose === "evidence" || purpose === "invoice") {
          const attachment = await prisma.attachment.findFirst({
            where: { storageKey: key },
            include: { dailyLog: { include: { activity: true } } }
          });
          if (attachment && (user.role === "head" || attachment.dailyLog.activity.createdById === session.id)) {
            authorized = true;
          }
        } else if (purpose === "message_attachment") {
          const msgAtt = await prisma.messageAttachment.findFirst({
            where: { storageKey: key },
            include: { directMessage: true }
          });
          if (msgAtt) {
            if (msgAtt.communityMessageId) {
              authorized = true;
            } else if (msgAtt.directMessage) {
              const dm = msgAtt.directMessage;
              if (dm.participantA === session.id || dm.participantB === session.id) {
                authorized = true;
              }
            }
          }
        }
      }
    }
  }

  if (!authorized) {
    return jsonError(403, "Forbidden");
  }

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

  const headers = new Headers();
  headers.set("Content-Type", type);
  headers.set("Cache-Control", purpose === "avatar" ? "public, max-age=86400" : "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");

  if (isS3Configured()) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      });
      const s3Response = await client.send(command);
      if (!s3Response.Body) {
        return jsonError(404, "Not found");
      }
      
      if (s3Response.ContentType) {
        headers.set("Content-Type", s3Response.ContentType);
      }
      
      const readable = s3Response.Body.transformToWebStream();
      return new Response(readable, { status: 200, headers });
    } catch (err: any) {
      if (err.name === "NoSuchKey" || err.name === "NotFound") {
        return jsonError(404, "Not found");
      }
      console.error("S3 GetObject error:", err);
      return jsonError(500, "Internal Server Error");
    }
  } else {
    // Local fallback
    const buf = await readLocalObject(key);
    if (!buf) return jsonError(404, "Not found");
    return new Response(new Uint8Array(buf), { status: 200, headers });
  }
}
