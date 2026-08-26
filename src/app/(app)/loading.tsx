export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden
        />
        <span className="text-sm text-foreground-secondary">Loading…</span>
      </div>
    </div>
  );
}
