
import { prisma } from "@/lib/db/prisma";
import { sendPushNotification } from "@/lib/pushServer";
import {
  prefAllowsPush,
  resolvePushContent,
} from "@/lib/notificationPolicy";
import type { NotifType } from "@/lib/types";

export { NOTIFICATION_TAXONOMY } from "@/lib/notificationPolicy";

/**
 * Centralized notification pipeline (PWA Notifications Everywhere — Phase 1).
 *
 * Invariant:
 *   Notification Event → create persistent DB record → check prefs → push if allowed.
 *
 * Preferences gate DELIVERY (web push) only — never history.
 */

export interface NotifyInput {
  userId: string;
  type: NotifType;
  text: string;
  activityId?: string | null;
  messageId?: string | null;
  meta?: Record<string, unknown> | null;
  /** Optional idempotency key. When provided, a recent duplicate is reused. */
  dedupeKey?: string | null;
}

export interface PushContent {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const DEDUPE_WINDOW_MS = 60_000;

async function findRecentDuplicate(input: NotifyInput) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  // Strong idempotency: same message delivered twice must not double-notify.
  if (input.messageId) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        messageId: input.messageId,
      },
    });
    if (existing) return existing;
  }
  if (input.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
    });
    // Only reuse when the stored dedupeKey matches (kept in meta).
    if (existing) {
      const meta = (existing.meta ?? {}) as Record<string, unknown>;
      if (meta.dedupeKey === input.dedupeKey) return existing;
    }
  }
  // Generic guard: identical event within the window (e.g. double-click /
  // retried request) produces one canonical record.
  return prisma.notification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      text: input.text,
      activityId: input.activityId ?? null,
      messageId: input.messageId ?? null,
      createdAt: { gt: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Single entry point for notification creation.
 * Always persists history; push is best-effort and never throws.
 */
export async function notifyUser(input: NotifyInput) {
  const userId = (input.userId || "").trim();
  const text = (input.text || "").trim();
  if (!userId || !text) return null;

  const duplicate = await findRecentDuplicate({ ...input, userId, text });
  if (duplicate) return duplicate;

  const meta =
    input.dedupeKey != null
      ? { ...(input.meta ?? {}), dedupeKey: input.dedupeKey }
      : (input.meta as object | undefined) ?? undefined;

  const record = await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      text,
      activityId: input.activityId ?? null,
      messageId: input.messageId ?? null,
      ...(meta !== undefined ? { meta } : {}),
    },
  });

  // Delivery preferences gate push only — history already exists above.
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        notificationsEnabled: true,
        dmNotifications: true,
        activityNotifications: true,
      },
    });
    if (!prefAllowsPush(prefs, input.type)) return record;

    const content = resolvePushContent(
      input.type,
      text,
      input.activityId ?? null,
    );
    const tag = `trak-${record.id}`;
    await sendPushNotification(userId, content.title, content.body, {
      url: content.url,
      notificationId: record.id,
      type: input.type,
      activityId: input.activityId ?? null,
      messageId: input.messageId ?? null,
    }, tag);
  } catch (err) {
    // Push must never break the originating operation.
    console.error("[notifications] push delivery failed:", err);
  }

  return record;
}

/** Fan-out helper — one canonical notification per recipient. Never throws. */
export async function notifyMany(inputs: NotifyInput[]) {
  const seen = new Set<string>();
  const results: Awaited<ReturnType<typeof notifyUser>>[] = [];
  for (const input of inputs) {
    const key = `${input.userId}::${input.type}::${input.messageId ?? ""}::${input.dedupeKey ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      results.push(await notifyUser(input));
    } catch (err) {
      console.error("[notifications] notifyMany item failed:", err);
      results.push(null);
    }
  }
  return results;
}
