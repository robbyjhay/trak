const fs = require('fs');
const file = 'src/app/(app)/(shell)/settings/unit/audit/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const humanize = `
const humanReadableAction = (action: string) => {
  const map: Record<string, string> = {
    "login": "Signed in",
    "logout": "Signed out",
    "password_changed": "Changed password",
    "member_created": "Created member",
    "preferences_updated": "Updated preferences",
    "default_password_updated": "Updated default password",
    "session_revoked": "Removed device",
  };
  return map[action] || action.replace(/_/g, ' ');
};

const formatTarget = (type: string | null, id: string | null) => {
  if (!type && !id) return "—";
  if (!id) return type || "—";
  if (type === "User") return \`Member (\${id.slice(0, 8)})\`;
  return \`\${type} (\${id.slice(0, 8)})\`;
};
`;

code = code.replace(
  /export default async function AuditLogPage/,
  humanize + '\nexport default async function AuditLogPage'
);

code = code.replace(
  /\{evt\.action\}/g,
  '{humanReadableAction(evt.action)}'
);

code = code.replace(
  /\{evt\.targetType\} \{evt\.targetId \? \`\(\$\{evt\.targetId\.slice\(0,8\)\}\.\.\.\)\` : ""\}/g,
  '{formatTarget(evt.targetType, evt.targetId)}'
);

code = code.replace(
  /style={{ scrollbarWidth: 'none' }}/,
  ''
);

fs.writeFileSync(file, code);
