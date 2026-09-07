with open("src/lib/db/service.ts", "r") as f:
    content = f.read()

if "processDueReminders" not in content:
    # Read the full processDueReminders block from backup
    import subprocess
    proc = subprocess.run(["git", "show", "backup/local-development-pre-reconstruction-2026-09-07:src/lib/db/service.ts"], capture_output=True, text=True)
    backup_content = proc.stdout
    import re
    # Extract processDueReminders function block
    match = re.search(r'export async function processDueReminders.*?\n}\n', backup_content, re.DOTALL)
    if match:
        content += "\n" + match.group(0) + "\n"
    # Extract dateStringOnly
    match = re.search(r'function dateStringOnly.*?\n}\n', backup_content, re.DOTALL)
    if match:
        content += "\n" + match.group(0) + "\n"
    
    with open("src/lib/db/service.ts", "w") as f:
        f.write(content)
