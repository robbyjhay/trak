import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/http";
import { getAuditEventById } from "@/lib/services/audit.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    if (session.role !== "head") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const { id } = await params;
    const event = await getAuditEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Audit event not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ event });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch audit event",
        },
      },
      { status: 500 },
    );
  }
}
