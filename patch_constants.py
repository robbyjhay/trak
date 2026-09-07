with open('src/lib/constants.ts', 'r') as f:
    content = f.read()

if 'activity_reminder:' not in content:
    content = content.replace(
        '  activity_missed:',
        '  activity_reminder: "M12 2v10l4.5 4.5 M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z",\n  activity_missed:'
    )

with open('src/lib/constants.ts', 'w') as f:
    f.write(content)
