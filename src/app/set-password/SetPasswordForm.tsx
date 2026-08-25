"use client";

import { useState, useActionState } from "react";
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
  const [state, formAction, pending] = useActionState<SetPasswordResult | null, FormData>(
    setNewPasswordAction,
    null,
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] bg-linear-to-br from-saffron to-[#d9a72c] shadow-[0_6px_18px_rgba(13,29,26,0.35)]">
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
            Set a new password
          </h1>
          <p className="mb-6 text-[13.5px] leading-relaxed text-foreground-secondary">
            Hi {firstName(name)} — choose a personal password (at least 12
            characters) before continuing into Trak.
          </p>

          <form action={formAction}>
            <div className="mb-4">
              <label
                htmlFor="spPass"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-foreground-secondary uppercase"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-3.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-border-strong focus:ring-1 focus:ring-border disabled:opacity-60"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="spConfirm"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-foreground-secondary uppercase"
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
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={pending}
                className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-3.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-border-strong focus:ring-1 focus:ring-border disabled:opacity-60"
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
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
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
            <form action={skipPasswordChangeAction}>
              <button
                type="submit"
                disabled={pending}
                className="mt-3 w-full cursor-pointer rounded-xl border-[1.5px] border-border bg-surface-interactive py-3 text-[13px] font-bold text-foreground-secondary transition-colors hover:border-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                Skip for now (dev only)
              </button>
            </form>
          )}

          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              disabled={pending}
              className="w-full cursor-pointer rounded-xl border-[1.5px] border-border bg-surface-interactive py-3 text-[13px] font-bold text-foreground-secondary transition-colors hover:border-critical/30 hover:text-critical focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
