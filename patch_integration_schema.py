with open("prisma/schema.prisma", "r") as f:
    schema = f.read()

if "guest" not in schema.split('enum AttendeeSource {')[1].split('}')[0]:
    schema = schema.replace('enum AttendeeSource {\n  unit\n  manual\n  link\n}', 'enum AttendeeSource {\n  unit\n  manual\n  link\n  guest\n}')

if "guestCode" not in schema:
    schema = schema.replace('  status        DailyLogStatus @default(pending)', '  status        DailyLogStatus @default(pending)\n  guestCode     String?        @unique @map("guest_code")\n  guestCodeExpiresAt DateTime? @map("guest_code_expires_at")')

if "profile_updated" not in schema:
    schema = schema.replace('  activity_missed\n  broadcast\n  community', '  activity_missed\n  broadcast\n  community\n  profile_updated')

with open("prisma/schema.prisma", "w") as f:
    f.write(schema)
