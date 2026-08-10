import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { SetPasswordForm } from "./SetPasswordForm";
import { isDevLoginEnabled } from "@/lib/env";

export default async function SetPasswordPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  if (!session.mustChangePassword) redirect("/dashboard");

  return (
    <SetPasswordForm
      name={session.name}
      allowSkip={isDevLoginEnabled()}
    />
  );
}
