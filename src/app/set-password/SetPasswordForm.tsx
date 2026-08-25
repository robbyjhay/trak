"use client";

import { useActionState } from "react";
import {
  setNewPasswordAction,
  skipPasswordChangeAction,
  logoutAction,
  type SetPasswordResult,
} from "@/lib/auth/actions";
import { firstName } from "@/lib/utils";
import { PATHS } from "@/components/icons";

export function SetPasswordForm({
  name,
  allowSkip = false,
}: {
  name: string;
  allowSkip?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SetPasswordResult | null,
    FormData
  >(setNewPasswordAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] bg-linear-to-br from-saffron to-[#d9a72c] shadow-[0_6px_18px_rgba(13,29,26,0.35)]">
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
            Set a new password
          </h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-ink-soft">
            Hi {firstName(name)} — choose a personal password (at least 12
            characters) before continuing into Trak.
          </p>

          <form action={formAction}>
            <div className="mb-4">
              <label
                htmlFor="spPass"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
              >
                New password
              </label>
              <input
                id="spPass"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 12 characters"
                minLength={12}
                maxLength={128}
                required
                className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="spConfirm"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
              >
                Confirm password
              </label>
              <input
                id="spConfirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the new password"
                minLength={12}
                maxLength={128}
                required
                className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
              />
            </div>

            {state && !state.ok && (
              <div
                className="mb-3 text-[12.5px] font-semibold text-critical"
                role="alert"
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-linear-to-br from-aztec-3 to-aztec py-3.5 text-[14.5px] font-bold text-paper disabled:opacity-60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d={PATHS.login} />
              </svg>
              {pending ? "Saving…" : "Save password & continue"}
            </button>
          </form>

          {allowSkip && (
            <form action={skipPasswordChangeAction} className="mt-3">
              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl border-[1.5px] border-line bg-surface py-3 text-[13px] font-bold text-ink-soft transition-colors hover:border-saffron-dim hover:text-ink"
              >
                Skip for now (dev only)
              </button>
            </form>
          )}

          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl border-[1.5px] border-line bg-surface py-3 text-[13px] font-bold text-ink-soft transition-colors hover:border-critical/30 hover:text-critical"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
