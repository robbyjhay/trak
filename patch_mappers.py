with open('src/lib/db/mappers.ts', 'r') as f:
    content = f.read()

target = """    mentions: isDeleted ? undefined : row.mentions?.map((m) => ({
      userId: m.userId,
      displayName: m.user?.profile?.name ?? m.user?.id ?? "Unknown",
      position: m.position,
    })),"""

replacement = """    mentions: isDeleted ? undefined : row.mentions?.map((m) => ({
      userId: m.userId,
      displayName: m.user?.profile?.name ?? m.user?.id ?? "Unknown",
      position: m.position,
      length: m.length,
    })),"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/lib/db/mappers.ts', 'w') as f:
        f.write(content)
    print("mappers patched")
else:
    print("target not found")
