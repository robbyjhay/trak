const fs = require('fs');
const file = 'src/app/(app)/(shell)/settings/unit/onboarding/DefaultPasswordForm.tsx';
let code = fs.readFileSync(file, 'utf8');

const helperText = `
      <div className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Used as the temporary password for newly created members. Members are required to set their own password when they first sign in. Changing this value does not affect existing members.
      </div>
`;

code = code.replace(
  /<form id="default-password-form" action=\{formAction\} className="flex flex-col gap-4">/,
  '<form id="default-password-form" action={formAction} className="flex flex-col gap-4">' + helperText
);

fs.writeFileSync(file, code);
