with open("prisma/schema.prisma", "r") as f:
    schema = f.read()

if "dueAt" not in schema:
    schema = schema.replace("  gracePeriodExpiresAt DateTime?", "  gracePeriodExpiresAt DateTime?\n  dueAt                DateTime?\n  reminderStatus       Json       @default(\"{}\")\n  reminderVersion      Int        @default(1)")
    schema = schema.replace('  activity_missed\n  broadcast', '  activity_missed\n  activity_reminder\n  broadcast')
    with open("prisma/schema.prisma", "w") as f:
        f.write(schema)
