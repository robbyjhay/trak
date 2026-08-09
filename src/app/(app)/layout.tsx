import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { TrakStoreProvider } from "@/context/TrakStore";
import { Rail } from "@/components/shell/Rail";
import { Topbar } from "@/components/shell/Topbar";
import { MobileNav } from "@/components/shell/MobileNav";
import { Toast } from "@/components/ui/Toast";
import { ReportPreviewProvider } from "@/components/reports/ReportPreview";
import { ConnectNavProvider } from "@/context/ConnectNav";
import { CallProvider } from "@/context/CallContext";
import { CallScreen } from "@/components/call/CallScreen";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <TrakStoreProvider session={session}>
      <ReportPreviewProvider>
        <ConnectNavProvider>
          <CallProvider>
            <div className="flex min-h-screen">
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
            <CallScreen />
          </CallProvider>
        </ConnectNavProvider>
      </ReportPreviewProvider>
    </TrakStoreProvider>
  );
}
