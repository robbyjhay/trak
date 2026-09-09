import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const submitterId = '00000000-0000-0000-0000-000000000000';
    const heads = await prisma.user.findMany({
      where: { role: "head", isActive: true, id: { not: submitterId } },
      select: { id: true },
    });
    console.log("Heads found:", heads.length);
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
