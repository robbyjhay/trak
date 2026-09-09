import { prisma } from './src/lib/db/prisma';

async function main() {
  try {
    const res = await prisma.libraryResource.findMany({
      where: { status: 'APPROVED' },
      include: {
        submittedBy: { include: { profile: true } },
        reviewer: { include: { profile: true } },
      },
      take: 20
    });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
