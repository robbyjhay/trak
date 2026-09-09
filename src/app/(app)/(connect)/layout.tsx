import { KeyboardSpacer } from "@/components/messaging/KeyboardSpacer";

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <KeyboardSpacer />
    </div>
  );
}
