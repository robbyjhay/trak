import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Reset password — Trak",
  description: "Choose a new password for your Trak account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = (params.token || "").trim();

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-[44px] w-[44px] items-center justify-center" aria-hidden>
            <img src="/logo-black.png" alt="Trak Logo" className="h-full w-full object-contain dark:hidden" />
              <img src="/logo-white.png" alt="Trak Logo" className="h-full w-full object-contain hidden dark:block" />
          </div>
          <div className="text-[12.5px] leading-snug tracking-[0.16em] text-foreground-secondary uppercase">
            Trak
          </div>
        </div>

        <div className="rounded-[20px] border border-border bg-surface p-8 shadow-[0_20px_50px_rgba(13,29,26,0.08)]">
          <h1 className="m-0 mb-1.5 font-display text-[24px] font-semibold text-foreground">
            Reset password
          </h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-foreground-secondary">
            Choose a personal password (at least 12 characters). All existing
            sessions will be signed out.
          </p>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div role="alert" className="text-[13.5px] font-semibold text-critical">
              This reset link is missing a token. Request a new link from the{" "}
              <Link href="/forgot-password" className="underline text-foreground">
                forgot password
              </Link>{" "}
              page.
            </div>
          )}

          <p className="mt-5 text-center text-[13px] text-foreground-secondary">
            <Link
              href="/login"
              className="font-bold text-foreground underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
