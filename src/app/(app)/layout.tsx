import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import {
  TrakStoreProvider,
  type BootstrapSnapshot,
} from "@/context/TrakStore";
import { Rail } from "@/components/shell/Rail";
import { Topbar } from "@/components/shell/Topbar";
import { MobileNav } from "@/components/shell/MobileNav";
import { Toast } from "@/components/ui/Toast";
import { ReportPreviewProvider } from "@/components/reports/ReportPreview";
import { ConnectNavProvider } from "@/context/ConnectNav";
import { CallProvider } from "@/context/CallContext";
import { IncomingCallOverlay } from "@/components/call/IncomingCallOverlay";
import { getScopedBootstrap } from "@/lib/db/service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  // First-login forced password change is blocking — no app page before it.
  if (session.mustChangePassword) redirect("/set-password");

  // Load scoped data on the server so the client is not stuck on "Loading Trak…"
  // waiting for /api/bootstrap (which was the post skip-password hang).
  let initialBootstrap: BootstrapSnapshot | null = null;
  try {
    const snap = await getScopedBootstrap(session);
    initialBootstrap = {
      users: snap.users,
      db: {
        activities: snap.activities,
        dailyLogs: snap.dailyLogs,
        comments: snap.comments,
        dms: snap.dms,
        calls: snap.calls,
        community: snap.community,
        broadcasts: snap.broadcasts,
        notifications: snap.notifications,
      },
      responsibilities: snap.responsibilities,
      serverTime: snap.serverTime,
    };
  } catch (err) {
    console.error("[app/layout] bootstrap failed; client will retry", err);
  }

  return (
    <TrakStoreProvider session={session} initialBootstrap={initialBootstrap}>
      <ReportPreviewProvider>
        <ConnectNavProvider>
          <CallProvider userId={session.id}>
            <IncomingCallOverlay />
            <div className="flex h-[100dvh] overflow-hidden w-full">
              <div className="hidden md:block">
                <Rail />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                {children}
              </div>
            </div>
            <MobileNav />
            <Toast />
          </CallProvider>
        </ConnectNavProvider>
      </ReportPreviewProvider>
    </TrakStoreProvider>
  );
}
