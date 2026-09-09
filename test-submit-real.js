import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findFirst();
    const created = await prisma.libraryResource.create({
      data: {
        title: "Test",
        category: "BOOK",
        description: "Test",
        externalUrl: "https://example.com",
        thumbnailKey: null,
        thumbnailUrl: "https://example.com/img.jpg",
        submittedById: user.id,
        status: "PENDING",
      },
      include: {
        submittedBy: { include: { profile: true } },
        reviewer: { include: { profile: true } },
      }
    });
    console.log("Created:", created.id);

    // Also run mapLibraryResource to see if it throws
    const mapped = {
      id: created.id,
      title: created.title,
      description: created.description,
      category: created.category,
      externalUrl: created.externalUrl,
      thumbnailKey: created.thumbnailKey,
      thumbnailUrl: created.thumbnailUrl,
      submittedById: created.submittedById,
      submittedByName: created.submittedBy?.profile?.name ?? "Member",
      status: created.status,
      declineReason: created.declineReason,
      reviewerId: created.reviewerId,
      reviewerName: created.reviewer?.profile?.name ?? null,
      reviewedAt: created.reviewedAt ? created.reviewedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
    console.log("Mapped successfully");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
