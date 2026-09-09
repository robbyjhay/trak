with open("src/lib/db/prisma.ts", "r") as f:
    content = f.read()
old = "export const prisma = globalForPrisma.prisma ?? createPrismaClient();"
new = """export const prisma = globalForPrisma.prisma ?? new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return (globalForPrisma.prisma as any)[prop];
  }
});"""
content = content.replace(old, new)
with open("src/lib/db/prisma.ts", "w") as f:
    f.write(content)
