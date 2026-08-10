import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { getDevRoster } from "@/lib/auth/dev-roster";
import { LoginForm } from "./LoginForm";
import { isDevLoginEnabled } from "@/lib/env";

export default async function LoginPage() {
  const session = await readSession();
  if (session) {
    if (session.mustChangePassword) redirect("/set-password");
    redirect("/dashboard");
  }

  const showRoster = isDevLoginEnabled();
  const roster = showRoster ? getDevRoster() : [];

  return (
    <main id="main">
      <LoginForm roster={roster} showRoster={showRoster} />
    </main>
  );
}
