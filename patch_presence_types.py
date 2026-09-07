with open("src/lib/types.ts", "r") as f:
    types = f.read()
if "profile_updated" not in types:
    types = types.replace('  | "activity_missed"\n  | "broadcast"', '  | "activity_missed"\n  | "broadcast"\n  | "profile_updated"')
    with open("src/lib/types.ts", "w") as f:
        f.write(types)
