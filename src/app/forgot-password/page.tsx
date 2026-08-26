import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = {
  title: "Forgot password — Trak",
  description: "Request a password reset link for your Trak account.",
};

export default function ForgotPasswordPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3.5">
          <div
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] bg-linear-to-br from-saffron to-[#d9a72c] shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            aria-hidden
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v2h18V7L12 2z" fill="currentColor" />
              <path
                d="M4 10v9h2v-9H4zm14 0v9h2v-9h-2zM9 10v9h2v-9H9zm4 0v9h2v-9h-2z"
                fill="currentColor"
              />
              <path d="M2 21h20v1.6H2z" fill="currentColor" />
            </svg>
          </div>
          <div className="text-[12.5px] leading-snug tracking-[0.16em] text-foreground-secondary uppercase">
            Trak — Digital Learning Unit
          </div>
        </div>

        <div className="rounded-[20px] border border-border bg-surface p-8 shadow-[0_20px_50px_rgba(13,29,26,0.08)]">
          <h1 className="m-0 mb-1.5 font-display text-[24px] font-semibold text-foreground">
            Forgot password
          </h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-foreground-secondary">
            Enter your username or the email on your account. If we find a
            match with email on file, we&apos;ll send a reset link.
          </p>

          <ForgotPasswordForm />

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
