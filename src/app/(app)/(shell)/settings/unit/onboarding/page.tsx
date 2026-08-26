import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DefaultPasswordForm } from "./DefaultPasswordForm";

export const metadata = { title: "Default Member Password" };

export default async function DefaultPasswordPage() {
  const session = await readSession();
  if (!session || session.role !== "head") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl">
      <h2 className="mb-1 font-display text-[20px] font-semibold">Unit Security</h2>
      <p className="mb-6 text-[13.5px] text-muted-foreground">
        Configure the default password used when creating new members. They will be prompted to change it at their first login.
      </p>

      <div className="rounded-card border border-border bg-surface shadow-card p-6">
        <DefaultPasswordForm />
      </div>
    </div>
  );
}
