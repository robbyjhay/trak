import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DefaultPasswordForm } from "./DefaultPasswordForm";
import { ThemeSettings } from "./ThemeSettings";

export default async function SettingsPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
        Trak
      </div>
      <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
        Settings
      </h1>
      <p className="m-0 mb-8 text-[13.5px] text-ink-soft">
        Account, notification and security settings land here in a later phase.
      </p>

      {session.role === "head" && (
        <div className="max-w-md rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="mb-1 font-display text-lg">Unit Security</h2>
          <p className="mb-6 text-[12px] text-ink-soft">
            Configure the default password used when creating new members. They will be prompted to change it at their first login.
          </p>
          <DefaultPasswordForm />
        </div>
      )}

      <div className="max-w-md mt-6">
        <ThemeSettings />
      </div>
    </div>
  );
}
