import { NextResponse } from "next/server";
import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/services/auth.service";
import {
  approveOnboardingRequest,
  declineOnboardingRequest,
} from "@/lib/services/onboarding.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await parseJsonBody<{ action?: "approve" | "decline" }>(req);
    const action = body.action;

    if (action === "approve") {
      const result = await approveOnboardingRequest(session, id);
      return jsonOk({
        ok: true,
        status: "approved",
        credentials: {
          username: result.username,
          starterPassword: result.starterPassword,
          memberName: result.memberName,
        },
      });
    }
    if (action === "decline") {
      await declineOnboardingRequest(session, id);
      return jsonOk({ ok: true, status: "declined" });
    }

    return NextResponse.json(
      { error: "action must be 'approve' or 'decline'." },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    return handleServiceError(err);
  }
}