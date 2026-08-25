const fs = require('fs');
const file = 'src/components/shell/Topbar.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const isConnect = pathname === "\/messages" \|\| pathname === "\/contacts";/,
  `const isConnect = pathname === "/messages" || pathname === "/contacts";
  const isSettings = pathname.startsWith("/settings");`
);

code = code.replace(
  /\{isConnect \? "Connect" : greeting\}/,
  `{isSettings ? "Settings" : isConnect ? "Connect" : greeting}`
);

fs.writeFileSync(file, code);
