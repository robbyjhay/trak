import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SettingsLayoutShell } from "./SettingsLayoutShell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  return <SettingsLayoutShell role={session.role}>{children}</SettingsLayoutShell>;
}
