/**
 * Object storage for avatars, evidence, invoices (Phase 3).
 * Uses S3-compatible storage when configured; otherwise local disk under .data/uploads.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";

class StorageError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export type UploadPurpose = "avatar" | "evidence" | "invoice" | "message_attachment" | "library_thumbnail";

const ALLOWED_MIME: Record<UploadPurpose, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  evidence: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  invoice: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  library_thumbnail: ["image/jpeg", "image/png", "image/webp"],
  message_attachment: [
    "image/jpeg", "image/png", "image/webp", 
    "application/pdf", 
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "application/zip"
  ],
};

const MAX_SIZE: Record<UploadPurpose, number> = {
  avatar: 2 * 1024 * 1024,
  evidence: 10 * 1024 * 1024,
  invoice: 10 * 1024 * 1024,
  library_thumbnail: 1 * 1024 * 1024,
  message_attachment: 25 * 1024 * 1024, // 25 MB
};

// App-server upload proxy cap (>= largest MAX_SIZE so per-purpose limits at
// sign time remain authoritative).
const MAX_PROXY_BYTES = 30 * 1024 * 1024;

/**
 * Required S3 env vars. S3_REGION/S3_ENDPOINT/S3_PUBLIC_BASE_URL are optional
 * depending on provider (see resolveS3PublicBaseUrl); the three below are not.
 */
const S3_REQUIRED_VARS = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export function isS3Configured(): boolean {
  return S3_REQUIRED_VARS.every((k) => Boolean(process.env[k]));
}

/** Which backend createSignedUpload() will route to. */
export function getStorageMode(): "s3" | "local" {
  return isS3Configured() ? "s3" : "local";
}

function localUploadDir(): string {
  return (
    process.env.TRAK_UPLOAD_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads")
  );
}

function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-powerpoint":
      return "ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "text/plain":
      return "txt";
    case "text/csv":
      return "csv";
    case "application/zip":
      return "zip";
    default:
      return "bin";
  }
}

const EXT_TO_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function normalizeContentType(contentType: string, filename?: string): string {
  if (contentType !== "application/octet-stream" || !filename) return contentType;
  const lower = filename.toLowerCase();
  for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
    if (lower.endsWith(ext)) return mime;
  }
  return contentType;
}

export function validateUpload(
  purpose: UploadPurpose,
  contentType: string,
  size: number,
): void {
  if (!ALLOWED_MIME[purpose]?.includes(contentType)) {
    throw new StorageError(
      400,
      `Content type ${contentType} not allowed for ${purpose}`,
    );
  }
  if (size <= 0 || size > MAX_SIZE[purpose]) {
    throw new StorageError(
      400,
      `File size must be between 1 byte and ${MAX_SIZE[purpose]} bytes`,
    );
  }
}

/**
 * Stable public URL base for S3 objects. Preference order:
 * 1. S3_PUBLIC_BASE_URL (CDN or custom domain — set this in production)
 * 2. S3_ENDPOINT + bucket (R2/MinIO-style path: <endpoint>/<bucket>)
 * 3. AWS regional virtual-hosted URL (requires a real S3_REGION)
 * Throws instead of producing a broken "undefined/..." URL.
 */
export function resolveS3PublicBaseUrl(): string {
  const bucket = process.env.S3_BUCKET!;
  const direct = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (direct) return direct;
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  if (endpoint) return `${endpoint}/${bucket}`;
  const region = process.env.S3_REGION;
  if (region && region !== "auto") {
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }
  throw new StorageError(
    500,
    "S3 public URL cannot be built: set S3_PUBLIC_BASE_URL (or S3_ENDPOINT, or a real S3_REGION)",
  );
}

export { StorageError };

export async function createSignedUpload(input: {
  purpose: UploadPurpose;
  contentType: string;
  filename?: string;
  size: number;
  userId: string;
}): Promise<{
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
  method: "PUT";
}> {
  const contentType = normalizeContentType(input.contentType, input.filename);
  validateUpload(input.purpose, contentType, input.size);

  const id = randomBytes(16).toString("hex");
  const ext = extForMime(contentType);
  const key = `${input.purpose}/${input.userId}/${id}.${ext}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Uploads always go through the app server (same-origin `/api/uploads/put`),
  // which forwards to S3/R2 with server credentials. Routing the browser
  // directly at the object store is avoided because it depends on the client's
  // own network reaching the store AND on the bucket's CORS rules — both of
  // which have caused production upload failures.
  const secret = process.env.TRAK_SESSION_SECRET;
  if (!secret) {
    throw new StorageError(500, "Upload signing secret not configured");
  }
  const token = createHash("sha256")
    .update(`${key}:${input.userId}:${secret}`)
    .digest("hex")
    .slice(0, 32);
  const uploadUrl = `/api/uploads/put?key=${encodeURIComponent(key)}&token=${token}`;
  const publicUrl = `/api/uploads/file?key=${encodeURIComponent(key)}`;

  return { key, uploadUrl, publicUrl, expiresAt, method: "PUT" };
}

export async function putLocalObject(
  key: string,
  stream: ReadableStream<Uint8Array> | null,
  expectedToken: string,
  userId: string,
  contentType?: string,
): Promise<void> {
  const secret = process.env.TRAK_SESSION_SECRET;
  if (!secret) {
    throw new StorageError(500, "Upload signing secret not configured");
  }
  const expected = createHash("sha256")
    .update(`${key}:${userId}:${secret}`)
    .digest("hex")
    .slice(0, 32);
  if (expected !== expectedToken) {
    throw new StorageError(403, "Invalid upload token");
  }
  if (key.includes("..") || key.startsWith("/")) {
    throw new StorageError(400, "Invalid key");
  }

  // Production: forward to S3-compatible storage using server credentials.
  // The request body is buffered (capped) so the SDK can send it as a byte
  // payload without needing a signed transfer from the browser.
  if (isS3Configured()) {
    const chunks: Buffer[] = [];
    let bytes = 0;
    if (stream) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytes += value.length;
          if (bytes > MAX_PROXY_BYTES) {
            throw new StorageError(413, "File too large");
          }
          chunks.push(Buffer.from(value));
        }
      }
    }

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: Buffer.concat(chunks),
        ContentType: contentType,
      }),
    );
    return;
  }

  const full = path.join(localUploadDir(), key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  
  if (!stream) {
    await fs.writeFile(full, Buffer.alloc(0));
    return;
  }

  const writeStream = createWriteStream(full);
  let bytesWritten = 0;

  try {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytesWritten += value.length;
        if (bytesWritten > MAX_PROXY_BYTES) {
          writeStream.destroy();
          await fs.unlink(full).catch(() => {});
          throw new StorageError(413, "File too large");
        }
        writeStream.write(value);
      }
    }
    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });
  } catch (err) {
    writeStream.destroy();
    await fs.unlink(full).catch(() => {});
    throw err;
  }
}

export async function readLocalObject(key: string): Promise<Buffer | null> {
  if (key.includes("..") || key.startsWith("/")) return null;
  try {
    return await fs.readFile(path.join(localUploadDir(), key));
  } catch {
    return null;
  }
}
