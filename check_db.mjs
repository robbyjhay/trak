import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'community_message_mentions';
  `;
  console.log(result);
  await prisma.$disconnect();
}
check().catch(console.error);
