import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
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
    console.log('Success:', created.id);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
