with open("prisma/schema.prisma", "r") as f:
    schema = f.read()
if "profile_updated" not in schema:
    schema = schema.replace('  activity_missed\n  broadcast', '  activity_missed\n  broadcast\n  profile_updated')
    with open("prisma/schema.prisma", "w") as f:
        f.write(schema)
