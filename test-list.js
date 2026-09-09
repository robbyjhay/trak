import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const rows = await prisma.libraryResource.findMany({
      where: { status: 'APPROVED' },
      include: {
        submittedBy: { include: { profile: true } },
        reviewer: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
    console.log("Rows:", rows.length);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
