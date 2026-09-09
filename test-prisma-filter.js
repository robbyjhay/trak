import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const res = await prisma.libraryResource.findMany({
      where: {
        OR: [
          { submittedBy: { profile: { name: { contains: "test", mode: "insensitive" } } } }
        ]
      }
    });
    console.log("Success");
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
