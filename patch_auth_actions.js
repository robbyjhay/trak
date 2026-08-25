const fs = require('fs');
const file = 'src/lib/auth/actions.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /await setDefaultMemberPassword\(password\);\s*return \{ ok: true \};/g,
  `await setDefaultMemberPassword(password);
    const { recordAuditEvent } = await import("@/lib/services/audit.service");
    await recordAuditEvent({
      userId: session.id,
      action: "settings_change",
      targetId: session.id,
      targetType: "unit_settings",
      meta: { field: "defaultMemberPassword" },
    });
    return { ok: true };`
);

fs.writeFileSync(file, code);
