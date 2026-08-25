const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /export async function sendDm\(\n  session: SessionUser,\n  toId: string,\n  text: string,\n\): Promise<\{ id: string \}> \{/,
  `export async function sendDm(
  session: SessionUser,
  toId: string,
  text: string,
  attachments?: any[]
): Promise<{ id: string }> {`
);

fs.writeFileSync(file, code);
