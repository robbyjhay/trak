import { handleServiceError, jsonError, jsonOk, requireSession } from "@/lib/api/http";
import { AuthError } from "@/lib/services/auth.service";
import { listOnboardingRequests } from "@/lib/services/onboarding.service";
import type { NextRequest } from "next/server";

const STATUSES = new Set(["pending", "approved", "declined"]);

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const statusRaw = (url.searchParams.get("status") || "").toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 200);
    const status =
      STATUSES.has(statusRaw)
        ? (statusRaw as "pending" | "approved" | "declined")
        : undefined;

    const requests = await listOnboardingRequests(session, { status, limit });
    return jsonOk({ requests });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}