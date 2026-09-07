import re

with open("src/lib/db/mappers.ts", "r") as f:
    text = f.read()

conflict = """<<<<<<< Updated upstream
  row: DbCommunity & { 
    attachments?: DbMessageAttachment[];
    mentions?: (DbMention & { user?: { id: string; profile?: { name: string } | null } })[];
=======
  row: DbCommunity & {
    attachments?: DbMessageAttachment[];
    mentions?: (DbMention & { user?: { id: string; profile?: { name: string } | null } })[];
    replyTo?: (DbCommunity & { attachments?: DbMessageAttachment[] }) | null;
>>>>>>> Stashed changes"""

replacement = """  row: DbCommunity & {
    attachments?: DbMessageAttachment[];
    mentions?: (DbMention & { user?: { id: string; profile?: { name: string } | null } })[];
    replyTo?: (DbCommunity & { attachments?: DbMessageAttachment[] }) | null;"""

text = text.replace(conflict, replacement)

with open("src/lib/db/mappers.ts", "w") as f:
    f.write(text)

