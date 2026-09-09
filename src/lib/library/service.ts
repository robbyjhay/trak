import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/db/service";
import { mapLibraryResource } from "@/lib/db/mappers";
import { notifyMany, notifyUser } from "@/lib/notifications";
import { isHead } from "@/lib/permissions";
import {
  extractYouTubeId,
  isAllowedExternalUrl,
  normalizeExternalUrl,
  youTubeThumbnailUrl,
} from "@/lib/library/urls";
import type {
  LibraryCategory,
  LibraryListParams,
  LibraryResource,
  LibraryStatus,
  SessionUser,
} from "@/lib/types";

const LIBRARY_CATEGORIES: LibraryCategory[] = ["BOOK", "VIDEO", "AUDIO", "MEMO", "OTHER"];
const LIBRARY_STATUSES: LibraryStatus[] = ["PENDING", "APPROVED", "DECLINED"];

const TITLE_MAX = 300;
const DESCRIPTION_MAX = 5000;
const URL_MAX = 2048;
const DECLINE_REASON_MAX = 1000;

export interface SubmitLibraryInput {
  title?: string;
  category?: string;
  description?: string;
  externalUrl?: string;
  /** Storage key from a prior `library_thumbnail` signed upload. */
  thumbnailKey?: string | null;
}

function requireActor(session: SessionUser) {
  if (!session?.id) throw new ServiceError(401, "Unauthorized");
}

function parseCategory(raw: unknown): LibraryCategory {
  const value = String(raw ?? "").trim().toUpperCase();
  if ((LIBRARY_CATEGORIES as string[]).includes(value)) {
    return value as LibraryCategory;
  }
  throw new ServiceError(400, "Select a valid resource type.");
}

function parseTitle(raw: unknown): string {
  const title = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!title) throw new ServiceError(400, "Resource name is required.");
  if (title.length > TITLE_MAX) {
    throw new ServiceError(400, `Resource name must be ${TITLE_MAX} characters or fewer.`);
  }
  return title;
}

function parseDescription(raw: unknown): string {
  const description = String(raw ?? "").trim();
  if (description.length > DESCRIPTION_MAX) {
    throw new ServiceError(400, `Description must be ${DESCRIPTION_MAX} characters or fewer.`);
  }
  return description;
}

function parseExternalUrl(raw: unknown): string {
  const url = normalizeExternalUrl(String(raw ?? ""));
  if (!url) throw new ServiceError(400, "Resource link is required.");
  if (url.length > URL_MAX) throw new ServiceError(400, "Resource link is too long.");
  if (!isAllowedExternalUrl(url)) {
    throw new ServiceError(400, "Enter a valid http(s) resource link.");
  }
  return url;
}

/**
 * Resolve the thumbnail for a submission.
 * - Uploaded covers win (ownership + image extension enforced server-side).
 * - YouTube URLs fall back to the deterministic provider thumbnail.
 * - Everything else requires a manual cover upload.
 */
function resolveThumbnail(
  externalUrl: string,
  thumbnailKey: string | null | undefined,
  userId: string,
): { thumbnailKey: string | null; thumbnailUrl: string | null } {
  const key = (thumbnailKey || "").trim();
  if (key) {
    const prefix = `library_thumbnail/${userId}/`;
    const lower = key.toLowerCase();
    const isImage = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
    if (!key.startsWith(prefix) || key.includes("..") || !isImage) {
      throw new ServiceError(400, "Invalid cover image. Upload a JPG, PNG or WebP cover first.");
    }
    return { thumbnailKey: key, thumbnailUrl: `/api/uploads/file?key=${encodeURIComponent(key)}` };
  }
  const auto = youTubeThumbnailUrl(externalUrl);
  if (auto) return { thumbnailKey: null, thumbnailUrl: auto };
  throw new ServiceError(400, "Add a cover image for this resource (upload a JPG, PNG or WebP).");
}

function buildSearchFilter(search: string) {
  const q = search.trim();
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { submittedBy: { profile: { name: { contains: q, mode: "insensitive" as const } } } },
    ],
  };
}

function buildOrder(sort: LibraryListParams["sort"]) {
  switch (sort) {
    case "name-asc":
      return { title: "asc" as const };
    case "name-desc":
      return { title: "desc" as const };
    case "oldest":
      return { createdAt: "asc" as const };
    case "newest":
    default:
      return { createdAt: "desc" as const };
  }
}

const resourceInclude = {
  submittedBy: { include: { profile: true } },
  reviewer: { include: { profile: true } },
} as const;

async function notifyHeadsOfSubmission(resource: { id: string; title: string }, submitterId: string) {
  const heads = await prisma.user.findMany({
    where: { role: "head", isActive: true, id: { not: submitterId } },
    select: { id: true },
  });
  if (heads.length === 0) return;
  await notifyMany(
    heads.map((h) => ({
      userId: h.id,
      type: "library_submitted" as const,
      text: `A new Library resource "${resource.title}" has been submitted for review.`,
      meta: { libraryId: resource.id, url: "/library/manage" },
      dedupeKey: `library:submit:${resource.id}`,
    })),
  );
}

async function notifyUnitOfSubmission(resource: { id: string; title: string }, submitterId: string) {
  const members = await prisma.user.findMany({
    where: { isActive: true, role: { not: "head" }, id: { not: submitterId } },
    select: { id: true },
  });
  if (members.length === 0) return;
  await notifyMany(
    members.map((m) => ({
      userId: m.id,
      type: "library_new" as const,
      text: `A new Library resource "${resource.title}" has been submitted for approval.`,
      meta: { libraryId: resource.id, url: "/library" },
      dedupeKey: `library:new:${resource.id}`,
    })),
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listApprovedResources(
  session: SessionUser,
  params: LibraryListParams & { page: number; limit: number },
): Promise<{ resources: LibraryResource[]; total: number }> {
  requireActor(session);
  const category = params.category && params.category !== "ALL" ? params.category : undefined;
  const where = {
    status: "APPROVED" as const,
    ...(category ? { category } : {}),
    ...buildSearchFilter(params.search ?? ""),
  };
  const [rows, total] = await Promise.all([
    prisma.libraryResource.findMany({
      where,
      include: resourceInclude,
      orderBy: buildOrder(params.sort),
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.libraryResource.count({ where }),
  ]);
  return { resources: rows.map(mapLibraryResource), total };
}

export async function listMySubmissions(
  session: SessionUser,
  params: { page: number; limit: number },
): Promise<{ resources: LibraryResource[]; total: number }> {
  requireActor(session);
  const where = { submittedById: session.id };
  const [rows, total] = await Promise.all([
    prisma.libraryResource.findMany({
      where,
      include: resourceInclude,
      orderBy: { createdAt: "desc" as const },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.libraryResource.count({ where }),
  ]);
  return { resources: rows.map(mapLibraryResource), total };
}

export async function listManageResources(
  session: SessionUser,
  params: LibraryListParams & { page: number; limit: number },
): Promise<{ resources: LibraryResource[]; total: number }> {
  requireActor(session);
  if (!isHead(session)) throw new ServiceError(403, "Only the Unit Head can manage the Library.");
  const category = params.category && params.category !== "ALL" ? params.category : undefined;
  const status = params.status && params.status !== "ALL" ? params.status : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...buildSearchFilter(params.search ?? ""),
  };
  const [rows, total] = await Promise.all([
    prisma.libraryResource.findMany({
      where,
      include: resourceInclude,
      orderBy: buildOrder(params.sort),
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.libraryResource.count({ where }),
  ]);
  return { resources: rows.map(mapLibraryResource), total };
}

export async function getLibraryResource(
  session: SessionUser,
  id: string,
): Promise<LibraryResource> {
  requireActor(session);
  const row = await prisma.libraryResource.findUnique({
    where: { id },
    include: resourceInclude,
  });
  if (!row) throw new ServiceError(404, "Resource not found.");
  if (row.status !== "APPROVED" && row.submittedById !== session.id && !isHead(session)) {
    throw new ServiceError(403, "Not allowed to view this resource.");
  }
  return mapLibraryResource(row);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function submitLibraryResource(
  session: SessionUser,
  input: SubmitLibraryInput,
): Promise<LibraryResource> {
  requireActor(session);
  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { isActive: true } });
  if (!actor?.isActive) throw new ServiceError(401, "Unauthorized");

  const title = parseTitle(input.title);
  const category = parseCategory(input.category);
  const description = parseDescription(input.description);
  const externalUrl = parseExternalUrl(input.externalUrl);
  const { thumbnailKey, thumbnailUrl } = resolveThumbnail(externalUrl, input.thumbnailKey, session.id);

  const created = await prisma.libraryResource.create({
    data: {
      title,
      category,
      description,
      externalUrl,
      thumbnailKey,
      thumbnailUrl,
      submittedById: session.id,
      status: "PENDING",
    },
    include: resourceInclude,
  });

  await notifyHeadsOfSubmission(created, session.id);
  await notifyUnitOfSubmission(created, session.id);
  return mapLibraryResource(created);
}

export async function approveLibraryResource(
  session: SessionUser,
  id: string,
): Promise<LibraryResource> {
  requireActor(session);
  if (!isHead(session)) throw new ServiceError(403, "Only the Unit Head can approve resources.");
  const existing = await prisma.libraryResource.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Resource not found.");

  const updated = await prisma.libraryResource.update({
    where: { id },
    data: {
      status: "APPROVED",
      declineReason: "",
      reviewerId: session.id,
      reviewedAt: new Date(),
    },
    include: resourceInclude,
  });

  if (updated.submittedById !== session.id) {
    await notifyUser({
      userId: updated.submittedById,
      type: "library_approved",
      text: `"${updated.title}" was approved and added to the Library.`,
      meta: { libraryId: updated.id, url: "/library" },
      dedupeKey: `library:review:${updated.id}:approved`,
    });
  }
  return mapLibraryResource(updated);
}

export async function declineLibraryResource(
  session: SessionUser,
  id: string,
  reason: unknown,
): Promise<LibraryResource> {
  requireActor(session);
  if (!isHead(session)) throw new ServiceError(403, "Only the Unit Head can decline resources.");
  const cleanReason = String(reason ?? "").trim().replace(/\s+/g, " ");
  if (!cleanReason) throw new ServiceError(400, "A reason is required to decline a resource.");
  if (cleanReason.length > DECLINE_REASON_MAX) {
    throw new ServiceError(400, `Reason must be ${DECLINE_REASON_MAX} characters or fewer.`);
  }
  const existing = await prisma.libraryResource.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Resource not found.");

  const updated = await prisma.libraryResource.update({
    where: { id },
    data: {
      status: "DECLINED",
      declineReason: cleanReason,
      reviewerId: session.id,
      reviewedAt: new Date(),
    },
    include: resourceInclude,
  });

  if (updated.submittedById !== session.id) {
    await notifyUser({
      userId: updated.submittedById,
      type: "library_declined",
      text: `"${updated.title}" was declined: ${cleanReason}`,
      meta: { libraryId: updated.id, url: "/library" },
      dedupeKey: `library:review:${updated.id}:declined`,
    });
  }
  return mapLibraryResource(updated);
}

export { extractYouTubeId };
