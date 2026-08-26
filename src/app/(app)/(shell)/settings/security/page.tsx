import { getSessionToken } from "@/lib/auth/session";
import { validateSession } from "@/lib/services/auth.service";
import { getUserSessions } from "@/lib/services/user-sessions.service";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SessionsList } from "./SessionsList";

export const metadata = { title: "Security Settings" };

export default async function SecuritySettingsPage() {
  const token = await getSessionToken();
  const sessionFull = token ? await validateSession(token) : null;
  if (!sessionFull) redirect("/login");

  const sessions = await getUserSessions(sessionFull.user.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="mb-1 font-display text-[20px] font-semibold">Change Password</h2>
        <p className="mb-6 text-[13.5px] text-muted-foreground">
          Update your password. Ensure it's at least 8 characters long.
        </p>
        <div className="rounded-card border border-border bg-surface p-6 shadow-card max-w-md">
          <ChangePasswordForm />
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-display text-[20px] font-semibold">Active Sessions</h2>
        <p className="mb-6 text-[13.5px] text-muted-foreground">
          Manage devices currently signed in to your account.
        </p>
        <div className="rounded-card border border-border bg-surface shadow-card overflow-hidden">
          <SessionsList sessions={sessions} currentSessionId={sessionFull.sessionId} />
        </div>
      </div>
    </div>
  );
}
