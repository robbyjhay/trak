import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const resources = await prisma.libraryResource.findMany({
      where: { status: 'APPROVED' },
      include: {
        submittedBy: { include: { profile: true } },
        reviewer: { include: { profile: true } },
      },
      take: 20
    });
    console.log('Success:', resources);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
