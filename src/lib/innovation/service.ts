import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/db/service";
import { mapInnovation } from "@/lib/db/mappers";
import { notifyMany, notifyUser } from "@/lib/notifications";
import { isHead } from "@/lib/permissions";
import type {
  Innovation,
  InnovationCategory,
  InnovationListParams,
  InnovationStatus,
  SessionUser,
} from "@/lib/types";

const INNOVATION_CATEGORIES: InnovationCategory[] = [
  "PROCESS",
  "TECHNOLOGY",
  "COMMUNITY",
  "TRAINING",
  "COMMUNICATION",
  "OTHER",
];

const TITLE_MAX = 300;
const DESCRIPTION_MAX = 5000;
const DETAILS_MAX = 5000;
const DECLINE_REASON_MAX = 1000;

export interface SubmitInnovationInput {
  title?: string;
  category?: string;
  description?: string;
  details?: string;
}

function requireActor(session: SessionUser) {
  if (!session?.id) throw new ServiceError(401, "Unauthorized");
}

function parseCategory(raw: unknown): InnovationCategory {
  const value = String(raw ?? "").trim().toUpperCase();
  if ((INNOVATION_CATEGORIES as string[]).includes(value)) {
    return value as InnovationCategory;
  }
  throw new ServiceError(400, "Select a valid category.");
}

function parseTitle(raw: unknown): string {
  const title = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!title) throw new ServiceError(400, "Innovation title is required.");
  if (title.length > TITLE_MAX) {
    throw new ServiceError(400, `Title must be ${TITLE_MAX} characters or fewer.`);
  }
  return title;
}

function parseDescription(raw: unknown): string {
  const desc = String(raw ?? "").trim();
  if (!desc) throw new ServiceError(400, "Description is required.");
  if (desc.length > DESCRIPTION_MAX) {
    throw new ServiceError(
      400,
      `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
    );
  }
  return desc;
}

function parseDetails(raw: unknown): string {
  const details = String(raw ?? "").trim();
  if (details.length > DETAILS_MAX) {
    throw new ServiceError(
      400,
      `Supporting details must be ${DETAILS_MAX} characters or fewer.`,
    );
  }
  return details;
}

function buildSearchFilter(search: string) {
  const q = search.trim();
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      {
        submittedBy: {
          profile: { name: { contains: q, mode: "insensitive" as const } },
        },
      },
    ],
  };
}

function buildOrder(sort: InnovationListParams["sort"]) {
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

const innovationInclude = {
  submittedBy: { include: { profile: true } },
  reviewer: { include: { profile: true } },
} as const;

async function notifyHeadsOfSubmission(
  innovation: { id: string; title: string },
  submitterId: string,
) {
  const heads = await prisma.user.findMany({
    where: { role: "head", isActive: true, id: { not: submitterId } },
    select: { id: true },
  });
  if (heads.length === 0) return;
  await notifyMany(
    heads.map((h) => ({
      userId: h.id,
      type: "innovation_submitted" as const,
      text: `A new Innovation idea "${innovation.title}" has been submitted for review.`,
      meta: { innovationId: innovation.id, url: "/innovation-cloud/manage" },
      dedupeKey: `innovation:submit:${innovation.id}`,
    })),
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listApprovedInnovations(
  session: SessionUser,
  params: InnovationListParams & { page: number; limit: number },
): Promise<{ innovations: Innovation[]; total: number }> {
  requireActor(session);
  const category =
    params.category && params.category !== "ALL" ? params.category : undefined;
  const where = {
    status: { in: ["APPROVED", "IMPLEMENTED"] as InnovationStatus[] },
    ...(category ? { category } : {}),
    ...buildSearchFilter(params.search ?? ""),
  };
  const [rows, total] = await Promise.all([
    prisma.innovation.findMany({
      where,
      include: innovationInclude,
      orderBy: buildOrder(params.sort),
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.innovation.count({ where }),
  ]);
  return { innovations: rows.map(mapInnovation), total };
}

export async function listMyInnovations(
  session: SessionUser,
  params: { page: number; limit: number },
): Promise<{ innovations: Innovation[]; total: number }> {
  requireActor(session);
  const where = { submittedById: session.id };
  const [rows, total] = await Promise.all([
    prisma.innovation.findMany({
      where,
      include: innovationInclude,
      orderBy: { createdAt: "desc" as const },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.innovation.count({ where }),
  ]);
  return { innovations: rows.map(mapInnovation), total };
}

export async function listManageInnovations(
  session: SessionUser,
  params: InnovationListParams & { page: number; limit: number },
): Promise<{ innovations: Innovation[]; total: number }> {
  requireActor(session);
  if (!isHead(session)) {
    throw new ServiceError(403, "Only the Unit Head can manage innovations.");
  }
  const category =
    params.category && params.category !== "ALL" ? params.category : undefined;
  const status =
    params.status && params.status !== "ALL" ? params.status : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...buildSearchFilter(params.search ?? ""),
  };
  const [rows, total] = await Promise.all([
    prisma.innovation.findMany({
      where,
      include: innovationInclude,
      orderBy: buildOrder(params.sort),
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.innovation.count({ where }),
  ]);
  return { innovations: rows.map(mapInnovation), total };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function submitInnovation(
  session: SessionUser,
  input: SubmitInnovationInput,
): Promise<Innovation> {
  requireActor(session);
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { isActive: true },
  });
  if (!actor?.isActive) throw new ServiceError(401, "Unauthorized");

  const title = parseTitle(input.title);
  const category = parseCategory(input.category);
  const description = parseDescription(input.description);
  const details = parseDetails(input.details);

  const created = await prisma.innovation.create({
    data: {
      title,
      category,
      description,
      details,
      submittedById: session.id,
      status: "PENDING",
    },
    include: innovationInclude,
  });

  await notifyHeadsOfSubmission(created, session.id);
  return mapInnovation(created);
}

export async function approveInnovation(
  session: SessionUser,
  id: string,
): Promise<Innovation> {
  requireActor(session);
  if (!isHead(session)) {
    throw new ServiceError(403, "Only the Unit Head can approve innovations.");
  }
  const existing = await prisma.innovation.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Innovation not found.");
  if (existing.status !== "PENDING") {
    throw new ServiceError(400, "Only pending innovations can be approved.");
  }

  const updated = await prisma.innovation.update({
    where: { id },
    data: {
      status: "APPROVED",
      declineReason: "",
      reviewerId: session.id,
      reviewedAt: new Date(),
    },
    include: innovationInclude,
  });

  if (updated.submittedById !== session.id) {
    await notifyUser({
      userId: updated.submittedById,
      type: "innovation_approved",
      text: `Your innovation idea "${updated.title}" was approved!`,
      meta: { innovationId: updated.id, url: "/innovation-cloud" },
      dedupeKey: `innovation:review:${updated.id}:approved`,
    });
  }
  return mapInnovation(updated);
}

export async function declineInnovation(
  session: SessionUser,
  id: string,
  reason: unknown,
): Promise<Innovation> {
  requireActor(session);
  if (!isHead(session)) {
    throw new ServiceError(403, "Only the Unit Head can decline innovations.");
  }
  const cleanReason = String(reason ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleanReason) {
    throw new ServiceError(400, "A reason is required to decline an innovation.");
  }
  if (cleanReason.length > DECLINE_REASON_MAX) {
    throw new ServiceError(
      400,
      `Reason must be ${DECLINE_REASON_MAX} characters or fewer.`,
    );
  }
  const existing = await prisma.innovation.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Innovation not found.");

  const updated = await prisma.innovation.update({
    where: { id },
    data: {
      status: "DECLINED",
      declineReason: cleanReason,
      reviewerId: session.id,
      reviewedAt: new Date(),
    },
    include: innovationInclude,
  });

  if (updated.submittedById !== session.id) {
    await notifyUser({
      userId: updated.submittedById,
      type: "innovation_declined",
      text: `Your innovation idea "${updated.title}" was not accepted: ${cleanReason}`,
      meta: { innovationId: updated.id, url: "/innovation-cloud" },
      dedupeKey: `innovation:review:${updated.id}:declined`,
    });
  }
  return mapInnovation(updated);
}

export async function implementInnovation(
  session: SessionUser,
  id: string,
): Promise<Innovation> {
  requireActor(session);
  if (!isHead(session)) {
    throw new ServiceError(
      403,
      "Only the Unit Head can mark innovations as implemented.",
    );
  }
  const existing = await prisma.innovation.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Innovation not found.");
  if (existing.status !== "APPROVED") {
    throw new ServiceError(
      400,
      "Only approved innovations can be marked as implemented.",
    );
  }

  const updated = await prisma.innovation.update({
    where: { id },
    data: {
      status: "IMPLEMENTED",
      implementedAt: new Date(),
    },
    include: innovationInclude,
  });

  if (updated.submittedById !== session.id) {
    await notifyUser({
      userId: updated.submittedById,
      type: "innovation_implemented",
      text: `Your innovation idea "${updated.title}" has been implemented! 🎉`,
      meta: { innovationId: updated.id, url: "/innovation-cloud" },
      dedupeKey: `innovation:implement:${updated.id}`,
    });
  }
  return mapInnovation(updated);
}
