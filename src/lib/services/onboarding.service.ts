/**
 * Onboarding service — self-onboarding approval flow.
 *
 * Flow:
 *  1. Head mints an `onboard` token from their dashboard (mintOnboardingLink).
 *  2. A prospective member opens /onboard?token=..., fills the Add-Member form
 *     (email now COMPULSORY) and submits (submitOnboardingRequest) — this only
 *     creates a PENDING request and notifies the head.
 *  3. Head approves or declines (approveOnboardingRequest / declineOnboardingRequest).
 *     On approval the member account is actually created (role=member, default
 *     member password), the member is emailed their username + starter password
 *     so they can sign in, and both head and member are notified.
 */
import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createAuthToken, consumeAuthToken } from "@/lib/auth/tokens";
import { AuthError, findById } from "@/lib/services/auth.service";
import { notifyUser } from "@/lib/notifications";
import { recordAuditEvent } from "@/lib/services/audit.service";
import { createUserAs } from "@/lib/db/service";
import {
  sendOnboardingApprovedEmail,
  sendOnboardingDeclinedEmail,
} from "@/lib/services/email.service";
import { isHead } from "@/lib/permissions";
import type { SessionUser } from "@/lib/types";

function dateFromIso(s: string): Date {
  return new Date(s.slice(0, 10) + "T00:00:00.000Z");
}

export type OnboardingSubmitInput = {
  name: string;
  username?: string;
  email: string;
  designation?: string;
  gradeLevel?: string;
  sex?: string;
  phone: string;
  stateOfOrigin?: string;
  dateJoined?: string;
};

export type OnboardingRequestView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string | null;
  designation: string | null;
  gradeLevel: string | null;
  sex: string | null;
  stateOfOrigin: string | null;
  dateJoined: string | null;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  head: { id: string; name: string | null; username: string };
  decidedBy: { id: string; name: string | null; username: string } | null;
  decidedAt: string | null;
};

function mapRequest(row: {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string | null;
  designation: string | null;
  gradeLevel: string | null;
  sex: string | null;
  stateOfOrigin: string | null;
  dateJoined: Date | null;
  status: string;
  createdAt: Date;
  head: { id: string; profile: { name: string | null } | null; username: string };
  decidedBy?: {
    id: string;
    profile: { name: string | null } | null;
    username: string;
  } | null;
  decidedAt?: Date | null;
}): OnboardingRequestView {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    username: row.username,
    designation: row.designation,
    gradeLevel: row.gradeLevel,
    sex: row.sex,
    stateOfOrigin: row.stateOfOrigin,
    dateJoined: row.dateJoined ? row.dateJoined.toISOString() : null,
    status: row.status as OnboardingRequestView["status"],
    createdAt: row.createdAt.toISOString(),
    head: { id: row.head.id, name: row.head.profile?.name ?? null, username: row.head.username },
    decidedBy: row.decidedBy
      ? {
          id: row.decidedBy.id,
          name: row.decidedBy.profile?.name ?? null,
          username: row.decidedBy.username,
        }
      : null,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Mint a single-use 12h `onboard` link for a Unit Head to hand to a new member. */
export async function mintOnboardingLink(
  session: SessionUser,
): Promise<{ link: string; expiresAt: string }> {
  if (!isHead(session)) {
    throw new AuthError(403, "FORBIDDEN", "Only the Unit Head can mint invite links.");
  }
  const { rawToken, expiresAt } = await createAuthToken("onboard", session.id);
  return {
    link: `${appUrl()}/onboard?token=${encodeURIComponent(rawToken)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Submit an onboarding request from a public /onboard?token=… form.
 * Consumes the `onboard` token, creates a PENDING request, and notifies the
 * head. Email is compulsory — it is how the approved login details are sent.
 */
export async function submitOnboardingRequest(
  rawToken: string,
  input: OnboardingSubmitInput,
): Promise<{ requestId: string }> {
  const name = (input.name || "").trim();
  const username = (input.username || "").trim();
  const designation = (input.designation || "").trim();
  const sex = (input.sex || "").trim();
  const phone = (input.phone || "").trim();
  const stateOfOrigin = (input.stateOfOrigin || "").trim();
  const dateJoined = (input.dateJoined || "").trim();
  const email = (input.email || "").trim().toLowerCase();

  const missing = [
    !name ? "full name" : null,
    !username ? "username" : null,
    !designation ? "designation" : null,
    !sex ? "sex" : null,
    !phone ? "phone" : null,
    !stateOfOrigin ? "state of origin" : null,
    !dateJoined ? "date joined" : null,
    !email ? "email" : null,
  ].filter(Boolean) as string[];
  if (missing.length) {
    throw new AuthError(
      400,
      "VALIDATION_ERROR",
      `The following fields are required: ${missing.join(", ")}.`,
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError(400, "VALIDATION_ERROR", "Enter a valid email address.");
  }

  // Consume the token ONLY after validation passes, so a validation error does
  // not burn the link. Atomic claim keeps the link strictly single-use.
  const consumed = await consumeAuthToken(rawToken, "onboard");
  if (!consumed) {
    throw new AuthError(400, "INVALID_TOKEN", "This invite link is invalid or has expired.");
  }

  const head = await findById(consumed.userId);
  if (!head || !head.isActive || head.role !== "head") {
    throw new AuthError(400, "INVALID_TOKEN", "This invite link is invalid or has expired.");
  }

  const request = await prisma.onboardingRequest.create({
    data: {
      headId: head.id,
      name,
      phone,
      email,
      username: username || null,
      designation: designation || null,
      gradeLevel: (input.gradeLevel || "").trim() || null,
      sex: sex || null,
      stateOfOrigin: stateOfOrigin || null,
      dateJoined: dateJoined ? dateFromIso(dateJoined) : null,
    },
  });

  await notifyUser({
    userId: head.id,
    type: "onboarding_requested",
    text: `${name} needs your approval to be onboarded.`,
    meta: { requestId: request.id },
    dedupeKey: `onboarding-requested:${request.id}`,
  });

  await recordAuditEvent({
    userId: head.id,
    action: "onboarding_requested",
    targetId: request.id,
    targetType: "onboarding_request",
    meta: { name, email, phone, username: request.username || undefined },
  });

  return { requestId: request.id };
}

/** Head lists onboarding requests (optionally filtered by status). */
export async function listOnboardingRequests(
  session: SessionUser,
  opts: { status?: "pending" | "approved" | "declined"; limit?: number } = {},
): Promise<OnboardingRequestView[]> {
  if (!isHead(session)) {
    throw new AuthError(403, "FORBIDDEN", "Only the Unit Head can review onboardings.");
  }
  const rows = await prisma.onboardingRequest.findMany({
    where: {
      headId: session.id,
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: {
      head: { select: { id: true, username: true, profile: { select: { name: true } } } },
      decidedBy: { select: { id: true, username: true, profile: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
  return rows.map(mapRequest);
}

/** Head approves a pending request: creates the member account + emails login details. */
export async function approveOnboardingRequest(
  session: SessionUser,
  requestId: string,
): Promise<{ username: string; starterPassword: string; memberName: string }> {
  if (!isHead(session)) {
    throw new AuthError(403, "FORBIDDEN", "Only the Unit Head can approve onboardings.");
  }

  const request = await prisma.onboardingRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.headId !== session.id) {
    throw new AuthError(404, "NOT_FOUND", "This onboarding request no longer exists.");
  }
  if (request.status !== "pending") {
    throw new AuthError(409, "CONFLICT", "This onboarding request has already been decided.");
  }

  const actor = await findById(session.id);
  if (!actor || !actor.isActive || actor.role !== "head") {
    throw new AuthError(403, "FORBIDDEN", "Only the Unit Head can approve onboardings.");
  }

  const created = await createUserAs(
    actor,
    {
      name: request.name,
      username: request.username || undefined,
      email: request.email,
      designation: request.designation || undefined,
      gradeLevel: request.gradeLevel || undefined,
      sex: request.sex || undefined,
      phone: request.phone,
      stateOfOrigin: request.stateOfOrigin || undefined,
      dateJoined: request.dateJoined ? request.dateJoined.toISOString() : undefined,
    },
    {
      auditUserId: session.id,
      forceRoleType: "member",
      sendInviteEmail: false,
    },
  );

  await prisma.onboardingRequest.update({
    where: { id: request.id },
    data: { status: "approved", decidedById: session.id, decidedAt: new Date() },
  });

  await notifyUser({
    userId: session.id,
    type: "onboarding_approved",
    text: `${request.name} has been onboarded to your unit.`,
    meta: { requestId: request.id, memberId: created.user.id },
    dedupeKey: `onboarding-approved:${request.id}`,
  });

  // Member now has an account — notify in-app.
  await notifyUser({
    userId: created.user.id,
    type: "onboarding_approved",
    text: `Welcome to Trak, ${request.name}! 🤩 Your onboarding is complete. We’re glad to have you on board.`,
    meta: { requestId: request.id },
  });

  // Compulsory email — deliver sign-in details so they can log in normally.
  try {
    await sendOnboardingApprovedEmail(request.email, {
      name: request.name,
      username: created.user.username,
      starterPassword: created.credentials.starterPassword,
    });
  } catch {
    // Best-effort; credentials remain available to the head.
  }

  await recordAuditEvent({
    userId: session.id,
    action: "onboarding_approved",
    targetId: request.id,
    targetType: "onboarding_request",
    meta: { name: request.name, email: request.email, memberId: created.user.id },
  });

  return {
    username: created.user.username,
    starterPassword: created.credentials.starterPassword,
    memberName: request.name,
  };
}

/** Head declines a pending onboarding request. No account is created. */
export async function declineOnboardingRequest(
  session: SessionUser,
  requestId: string,
): Promise<void> {
  if (!isHead(session)) {
    throw new AuthError(403, "FORBIDDEN", "Only the Unit Head can decline onboardings.");
  }

  const request = await prisma.onboardingRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.headId !== session.id) {
    throw new AuthError(404, "NOT_FOUND", "This onboarding request no longer exists.");
  }
  if (request.status !== "pending") {
    throw new AuthError(409, "CONFLICT", "This onboarding request has already been decided.");
  }

  await prisma.onboardingRequest.update({
    where: { id: request.id },
    data: { status: "declined", decidedById: session.id, decidedAt: new Date() },
  });

  await notifyUser({
    userId: session.id,
    type: "onboarding_declined",
    text: `You declined ${request.name}'s onboarding request.`,
    meta: { requestId: request.id },
    dedupeKey: `onboarding-declined:${request.id}`,
  });

  try {
    await sendOnboardingDeclinedEmail(request.email, request.name);
  } catch {
    // Best-effort
  }

  await recordAuditEvent({
    userId: session.id,
    action: "onboarding_declined",
    targetId: request.id,
    targetType: "onboarding_request",
    meta: { name: request.name, email: request.email },
  });
}