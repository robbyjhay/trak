import Link from "next/link";
import { OnboardForm } from "./OnboardForm";

export const metadata = {
  title: "Join Trak — Trak",
  description: "Create your Trak member account.",
};

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = (params.token || "").trim();

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground sm:p-[6vh]"
    >
      <div className="w-full max-w-[460px] sm:max-w-[720px]">
        <div className="mb-6 flex items-center gap-3.5 justify-center sm:justify-start">
          <div className="flex h-[44px] w-[44px] items-center justify-center" aria-hidden>
            <img src="/logo-black.png" alt="Trak Logo" className="h-full w-full object-contain dark:hidden" />
            <img src="/logo-white.png" alt="Trak Logo" className="h-full w-full object-contain hidden dark:block" />
          </div>
          <div className="text-[12.5px] leading-snug tracking-[0.16em] text-foreground-secondary uppercase">
            Trak
          </div>
        </div>

        <div className="overflow-y-auto rounded-[20px] border border-border bg-modal p-7 shadow-modal sm:p-10">
          {token ? (
            <OnboardForm token={token} />
          ) : (
            <>
              <h1 className="m-0 mb-1.5 font-display text-xl text-foreground">
                Add member
              </h1>
              <p className="mb-5 text-[12.5px] text-foreground-secondary">
                You&apos;ve been invited to join your unit on Trak. Fill in your
                details to create your account — your role is set to Member and
                you&apos;ll set your own password on first sign-in.
              </p>
              <div
                role="alert"
                className="mb-1 rounded-lg bg-critical-surface px-3 py-2 text-[12px] font-semibold text-critical-semantic"
              >
                This invite link is missing a token. Ask your Unit Head to send a
                valid invite link.
              </div>
            </>
          )}

          <p className="mt-5 text-center text-[13px] text-foreground-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-foreground underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}