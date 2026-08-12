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
    <main id="main" className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3.5">
          <div
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] bg-linear-to-br from-saffron to-[#d9a72c] shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            aria-hidden
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v2h18V7L12 2z" fill="#0d1d1a" />
              <path
                d="M4 10v9h2v-9H4zm14 0v9h2v-9h-2zM9 10v9h2v-9H9zm4 0v9h2v-9h-2z"
                fill="#0d1d1a"
              />
              <path d="M2 21h20v1.6H2z" fill="#0d1d1a" />
            </svg>
          </div>
          <div className="text-[12.5px] leading-snug tracking-[0.16em] text-ink-soft uppercase">
            Trak — Digital Learning Unit
          </div>
        </div>

        <div className="rounded-[20px] border border-line bg-card p-8 shadow-[0_20px_50px_rgba(13,29,26,0.08)]">
          <h1 className="m-0 mb-1.5 font-display text-[24px] font-semibold">
            Reset password
          </h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-ink-soft">
            Choose a personal password (at least 12 characters). All existing
            sessions will be signed out.
          </p>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div role="alert" className="text-[13.5px] font-semibold text-critical">
              This reset link is missing a token. Request a new link from the{" "}
              <Link href="/forgot-password" className="underline">
                forgot password
              </Link>{" "}
              page.
            </div>
          )}

          <p className="mt-5 text-center text-[13px] text-ink-soft">
            <Link
              href="/login"
              className="font-bold text-aztec underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
