/**
 * Object storage for avatars, evidence, invoices (Phase 3).
 * Uses S3-compatible storage when configured; otherwise local disk under .data/uploads.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
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

export type UploadPurpose = "avatar" | "evidence" | "invoice";

const ALLOWED_MIME: Record<UploadPurpose, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  evidence: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  invoice: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

const MAX_SIZE: Record<UploadPurpose, number> = {
  avatar: 2 * 1024 * 1024,
  evidence: 10 * 1024 * 1024,
  invoice: 10 * 1024 * 1024,
};

function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
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
    default:
      return "bin";
  }
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

export { StorageError };

export async function createSignedUpload(input: {
  purpose: UploadPurpose;
  contentType: string;
  size: number;
  userId: string;
}): Promise<{
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
  method: "PUT";
}> {
  validateUpload(input.purpose, input.contentType, input.size);

  const id = randomBytes(16).toString("hex");
  const ext = extForMime(input.contentType);
  const key = `${input.purpose}/${input.userId}/${id}.${ext}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (isS3Configured()) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: input.contentType,
      ContentLength: input.size,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicBase =
      process.env.S3_PUBLIC_BASE_URL ||
      `${process.env.S3_ENDPOINT?.replace(/\/$/, "")}/${process.env.S3_BUCKET}`;
    const publicUrl = `${publicBase.replace(/\/$/, "")}/${key}`;

    return { key, uploadUrl, publicUrl, expiresAt, method: "PUT" };
  }

  // Local dev: signed path token for our own upload route
  const token = createHash("sha256")
    .update(`${key}:${input.userId}:${process.env.TRAK_SESSION_SECRET || "dev"}`)
    .digest("hex")
    .slice(0, 32);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const uploadUrl = `${appUrl}/api/uploads/put?key=${encodeURIComponent(key)}&token=${token}`;
  const publicUrl = `${appUrl}/api/uploads/file?key=${encodeURIComponent(key)}`;

  return { key, uploadUrl, publicUrl, expiresAt, method: "PUT" };
}

export async function putLocalObject(
  key: string,
  body: Buffer,
  expectedToken: string,
  userId: string,
): Promise<void> {
  const expected = createHash("sha256")
    .update(`${key}:${userId}:${process.env.TRAK_SESSION_SECRET || "dev"}`)
    .digest("hex")
    .slice(0, 32);
  if (expected !== expectedToken) {
    throw new StorageError(403, "Invalid upload token");
  }
  if (key.includes("..") || key.startsWith("/")) {
    throw new StorageError(400, "Invalid key");
  }

  const full = path.join(localUploadDir(), key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
}

export async function readLocalObject(key: string): Promise<Buffer | null> {
  if (key.includes("..") || key.startsWith("/")) return null;
  try {
    return await fs.readFile(path.join(localUploadDir(), key));
  } catch {
    return null;
  }
}
