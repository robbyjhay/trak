const fs = require('fs');
const file = 'src/app/(app)/(shell)/settings/SettingsLayoutShell.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className=\{`w-full md:w-64 shrink-0 md:sticky md:top-\[112px\] md:self-start md:max-h-\[calc\(100vh-120px\)\] overflow-y-auto no-scrollbar \$\{!\isHome \? 'hidden md:block' : 'block'\}\`\}/,
  'className={`w-full md:w-64 shrink-0 md:sticky md:top-[112px] md:self-start md:max-h-[calc(100vh-120px)] overflow-y-auto ${!isHome ? \\\'hidden md:block\\\' : \\\'block\\\'}`} style={{ scrollbarWidth: "none" }}'
);

fs.writeFileSync(file, code);
