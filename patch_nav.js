const fs = require('fs');
const file = 'src/app/(app)/(shell)/settings/SettingsNav.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const active = pathname === l.href \|\| pathname.startsWith\(l.href \+ "\/"\);/g,
  'const active = pathname === l.href || (pathname?.startsWith(l.href + "/") ?? false);'
);

fs.writeFileSync(file, code);
