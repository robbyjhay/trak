import { TrakLoader } from "@/components/ui/TrakLoader";

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <TrakLoader />
        <span className="text-sm text-foreground-secondary">Loading…</span>
      </div>
    </div>
  );
}
