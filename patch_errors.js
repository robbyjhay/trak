const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/dmRows\.map\(mapDm\)/g, 'dmRows.map(r => mapDm(r))');
code = code.replace(/communityRows\.map\(mapCommunity\)/g, 'communityRows.map(r => mapCommunity(r))');
code = code.replace(/rows\.map\(mapDm\)/g, 'rows.map(r => mapDm(r))');
code = code.replace(/rows\.map\(mapCommunity\)/g, 'rows.map(r => mapCommunity(r))');

fs.writeFileSync(file, code);
