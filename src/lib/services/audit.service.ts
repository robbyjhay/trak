import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/log";

export type AuditAction =
  | "user_create"
  | "user_update"
  | "user_delete"
  | "user_activate"
  | "user_deactivate"
  | "role_change"
  | "password_reset_request"
  | "password_reset_complete"
  | "password_change"
  | "login"
  | "logout"
  | "session_revoke"
  | "invite_create"
  | "invite_accept"
  | "activity_create"
  | "activity_update"
  | "activity_delete"
  | "activity_complete"
  | "activity_miss"
  | "report_generate"
  | "settings_change";

export interface AuditEventInput {
  userId?: string;
  action: AuditAction;
  targetId?: string;
  targetType?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetId: input.targetId,
        targetType: input.targetType,
        meta:
          input.meta === undefined
            ? undefined
            : (input.meta as Prisma.InputJsonValue),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    log.error("audit_event_failed", err, { action: input.action, userId: input.userId });
  }
}

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  targetId?: string;
  targetType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  orderBy?: "createdAt" | "action";
  orderDir?: "asc" | "desc";
}

export async function queryAuditEvents(options: AuditQueryOptions = {}) {
  const {
    userId,
    action,
    targetId,
    targetType,
    from,
    to,
    limit = 50,
    offset = 0,
    orderBy = "createdAt",
    orderDir = "desc",
  } = options;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (targetId) where.targetId = targetId;
  if (targetType) where.targetType = targetType;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = from;
    if (to) (where.createdAt as Record<string, Date>).lte = to;
  }

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { [orderBy]: orderDir },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return { events, total, limit, offset };
}

export async function getAuditEventById(id: string) {
  return prisma.auditEvent.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, username: true, email: true, role: true },
      },
    },
  });
}