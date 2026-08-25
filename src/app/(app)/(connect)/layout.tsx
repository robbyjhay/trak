import { ConnectTabs } from "@/components/messaging/ConnectTabs";

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-88px)] w-full flex-col">
      <div className="sticky top-[88px] z-30 mb-0 flex justify-center md:hidden bg-background py-2">
        <ConnectTabs />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
