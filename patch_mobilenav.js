const fs = require('fs');
const file = 'src/components/shell/MobileNav.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /if \(pathname === item\.href\) return true;/,
  `if (pathname === item.href) return true;
    if (item.href === "/settings" && pathname.startsWith("/settings")) return true;`
);

fs.writeFileSync(file, code);
