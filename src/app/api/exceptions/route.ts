import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/api/http";
import { mapActivity } from "@/lib/db/mappers";
import { ServiceError } from "@/lib/db/service";

export async function GET(_req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const actor = await prisma.user.findUnique({
      where: { id: session.id },
      include: { profile: true },
    });
    if (!actor || !actor.isActive) {
      throw new ServiceError(401, "Unauthorized");
    }
    if (actor.role !== "head") {
      throw new ServiceError(403, "Only the Unit Head can view exception requests.");
    }

    const activities = await prisma.activity.findMany({
      where: {
        status: "missed",
        exceptionStatus: { in: ["requested", "approved"] },
        softDeletedAt: null,
      },
      include: { createdBy: { include: { profile: true } }, responsibilities: true },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = activities.map((a) => {
      const act = mapActivity(a);
      return {
        ...act,
        memberName: a.createdBy.profile?.name || a.createdBy.username,
      };
    });

    return NextResponse.json({ exceptions: mapped });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/exceptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}