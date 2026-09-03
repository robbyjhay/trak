import { ConnectTabs } from "@/components/messaging/ConnectTabs";
import { KeyboardSpacer } from "@/components/messaging/KeyboardSpacer";

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <div className="sticky top-[var(--topbar-height)] z-30 mb-0 flex justify-center md:hidden bg-background py-2">
        <ConnectTabs />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      <KeyboardSpacer />
    </div>
  );
}
