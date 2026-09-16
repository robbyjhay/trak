import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { mintOnboardingLink } from "@/lib/services/onboarding.service";
import { AuthError } from "@/lib/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const result = await mintOnboardingLink(session);
    return jsonOk({ link: result.link, expiresAt: result.expiresAt });
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