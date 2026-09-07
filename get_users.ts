import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ take: 2, include: { profile: true } });
  console.log(users.map(u => ({ username: u.username, name: u.profile?.name })));
}
run();
