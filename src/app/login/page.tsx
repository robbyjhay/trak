import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { getDevRoster } from "@/lib/auth/dev-roster";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect("/dashboard");

  const roster = getDevRoster();
  const showRoster = process.env.NODE_ENV !== "production";

  return <LoginForm roster={showRoster ? roster : []} showRoster={showRoster} />;
}
