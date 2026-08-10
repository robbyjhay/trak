"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="m-0 font-display text-xl font-semibold text-ink">
        Something went wrong
      </h2>
      <p className="max-w-md text-center text-sm text-ink-soft">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-aztec px-5 py-2.5 text-sm font-bold text-paper hover:bg-aztec-2"
      >
        Try again
      </button>
    </div>
  );
}
