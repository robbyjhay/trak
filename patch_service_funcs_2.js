const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /export async function listCommunity\(\n  opts\?: \{ page\?: number; limit\?: number \},\n\): Promise<\{ community: ReturnType<typeof mapCommunity>\[\]; total: number \}> \{/,
  `export async function listCommunity(
  opts?: { page?: number; limit?: number; userId?: string },
): Promise<{ community: ReturnType<typeof mapCommunity>[]; total: number }> {`
);

code = code.replace(
  /export async function sendDm\(\n  session: SessionUser,\n  toUserId: string,\n  text: string,\n\): Promise<\{ id: string \}> \{/,
  `export async function sendDm(
  session: SessionUser,
  toUserId: string,
  text: string,
  attachments?: any[]
): Promise<{ id: string }> {`
);

fs.writeFileSync(file, code);
