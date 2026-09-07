import re

with open('src/lib/types.ts', 'r') as f:
    content = f.read()

target = """export interface MessageMention {
  userId: string;
  displayName: string;
  position: number;
}"""

replacement = """export interface MessageMention {
  userId: string;
  displayName: string;
  position: number;
  length: number;
}"""

if target in content:
    new_content = content.replace(target, replacement)
    with open('src/lib/types.ts', 'w') as f:
        f.write(new_content)
    print("Patched successfully")
else:
    print("Target block not found. Trying regex...")
    pattern = r'(export interface MessageMention \{[\s\S]*?position: number;)(\s*\})'
    match = re.search(pattern, content)
    if match:
        new_content = content[:match.start()] + match.group(1) + '\n  length: number;' + match.group(2) + content[match.end():]
        with open('src/lib/types.ts', 'w') as f:
            f.write(new_content)
        print("Patched successfully with regex")
    else:
        print("Failed to patch")
