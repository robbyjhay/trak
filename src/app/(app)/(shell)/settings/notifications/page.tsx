import { readSession } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/services/user-preferences.service";
import { redirect } from "next/navigation";
import { NotificationForm } from "./NotificationForm";

export const metadata = { title: "Notification Settings" };

export default async function NotificationSettingsPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const prefs = await getUserPreferences(session.id);

  return (
    <div className="max-w-xl">
      <h2 className="mb-1 font-display text-[20px] font-semibold">Notifications</h2>
      <p className="mb-6 text-[13.5px] text-muted-foreground">
        Choose which notifications you receive.
      </p>

      <div className="rounded-card border border-border bg-surface shadow-card p-6">
        <NotificationForm initialPrefs={prefs} />
      </div>
    </div>
  );
}
