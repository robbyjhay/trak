const fs = require('fs');
const file = 'src/app/(app)/(shell)/settings/layout.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<div className="w-full md:w-64 shrink-0">/g,
  '<div className="w-full md:w-64 shrink-0 md:sticky md:top-[112px] md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto hidden md:block scrollbar-hide">'
);

fs.writeFileSync(file, code);
