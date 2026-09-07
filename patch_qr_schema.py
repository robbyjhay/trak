with open("prisma/schema.prisma", "r") as f:
    schema = f.read()

if "guest_code" not in schema:
    schema = schema.replace('  unit\n  manual\n  link', '  unit\n  manual\n  link\n  guest')
    schema = schema.replace('  status        DailyLogStatus @default(pending)', '  status        DailyLogStatus @default(pending)\n  guestCode     String?        @unique @map("guest_code")\n  guestCodeExpiresAt DateTime? @map("guest_code_expires_at")')
    with open("prisma/schema.prisma", "w") as f:
        f.write(schema)
