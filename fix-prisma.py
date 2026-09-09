with open("prisma.config.ts", "r") as f:
    content = f.read()
content = content.replace('env("DATABASE_URL")', 'process.env.DATABASE_URL as string')
with open("prisma.config.ts", "w") as f:
    f.write(content)
