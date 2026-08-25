const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const unitSettings = await prisma.unitSettings.findFirst();
    console.log("UnitSettings:", unitSettings);
  } catch(e) {
    console.error("Prisma Error:", e);
  }
}
test().finally(() => pool.end());
