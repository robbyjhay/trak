import { ConnectTabs } from "@/components/messaging/ConnectTabs";

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-[calc(100dvh-68px)] w-full max-w-[1200px] flex-col px-5 py-5 sm:px-11 md:py-6">
      <div className="sticky top-[68px] z-30 mb-3 flex justify-center md:hidden">
        <ConnectTabs />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
