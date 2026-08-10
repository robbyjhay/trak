import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/http";
import {
  queryAuditEvents,
  type AuditAction,
} from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    if (session.role !== "head") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const action = (searchParams.get("action") as AuditAction | null) || undefined;
    const targetId = searchParams.get("targetId") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : undefined;
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const orderBy =
      (searchParams.get("orderBy") as "createdAt" | "action") || "createdAt";
    const orderDir =
      (searchParams.get("orderDir") as "asc" | "desc") || "desc";

    const result = await queryAuditEvents({
      userId,
      action,
      targetId,
      targetType,
      from,
      to,
      limit,
      offset,
      orderBy,
      orderDir,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch audit events",
        },
      },
      { status: 500 },
    );
  }
}
