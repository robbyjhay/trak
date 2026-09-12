import { handleServiceError, jsonOk, requireSession } from "@/lib/api/http";
import { prisma } from "@/lib/db/prisma";
import { mapInnovation } from "@/lib/db/mappers";
import { isHead } from "@/lib/permissions";
import { ServiceError } from "@/lib/db/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    const row = await prisma.innovation.findUnique({
      where: { id },
      include: {
        submittedBy: { include: { profile: true } },
        reviewer: { include: { profile: true } },
      },
    });
    if (!row) throw new ServiceError(404, "Innovation not found.");

    // Members can only see their own or approved/implemented
    if (
      !["APPROVED", "IMPLEMENTED"].includes(row.status) &&
      row.submittedById !== session.id &&
      !isHead(session)
    ) {
      throw new ServiceError(403, "Not allowed to view this innovation.");
    }

    return jsonOk({ innovation: mapInnovation(row) });
  } catch (err) {
    return handleServiceError(err);
  }
}
