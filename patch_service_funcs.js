const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

// fix listCommunity
code = code.replace(
  /export async function listCommunity\(\s*opts\?: \{ page\?: number; limit\?: number \},\s*\): Promise<\{ community: ReturnType<typeof mapCommunity>\[\]; total: number \}> \{/,
  `export async function listCommunity(
  opts?: { page?: number; limit?: number; userId?: string },
): Promise<{ community: ReturnType<typeof mapCommunity>[]; total: number }> {`
);

// fix sendCommunity signature in route.ts expects attachments
// wait, the error is: sendCommunity(session, body.text || "", body.replyToId, body.attachments)
// Let's see sendCommunity signature
