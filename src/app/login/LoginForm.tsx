"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginResult } from "@/lib/auth/actions";
import { cn, initials, firstName } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import { PATHS } from "@/components/icons";
import type { UserRole } from "@/lib/types";

type RosterItem = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isSecretary: boolean;
  isCorps: boolean;
  color: string;
};

export function LoginForm({
  roster,
  showRoster,
  passwordResetNotice = false,
}: {
  roster: RosterItem[];
  showRoster: boolean;
  passwordResetNotice?: boolean;
}) {
  const [state, formAction, pending] = useActionState<LoginResult | null, FormData>(
    loginAction,
    null,
  );
  const [username, setUsername] = useState(showRoster ? "dev" : "");
  const [password, setPassword] = useState(showRoster ? "dev" : "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function fillUser(id: string) {
    setSelectedId(id);
    try {
      const res = await fetch(`/api/auth/dev-fill?id=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { username: string; password: string };
      setUsername(data.username);
      setPassword(data.password);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <section className="relative flex min-w-0 flex-col justify-between border-b border-paper/14 bg-linear-to-br from-aztec via-aztec-2 to-aztec-3 px-8 py-6 text-paper         md:flex-[1.05] md:border-r md:border-b-0 md:px-16 md:py-14">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-linear-to-br from-saffron to-[#d9a72c] shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v2h18V7L12 2z" fill="#0d1d1a" />
                <path
                  d="M4 10v9h2v-9H4zm14 0v9h2v-9h-2zM9 10v9h2v-9H9zm4 0v9h2v-9h-2z"
                  fill="#0d1d1a"
                />
                <path d="M2 21h20v1.6H2z" fill="#0d1d1a" />
              </svg>
            </div>
            <div className="text-[12.5px] leading-snug tracking-[0.16em] text-paper/68 uppercase">
              Lagos State Government · PSSDC
              <b className="block text-[12.5px] tracking-[0.14em] text-saffron">
                Digital Learning Unit
              </b>
            </div>
          </div>
          <div className="mt-6 md:mt-16">
            <h1 className="m-0 mb-[18px] font-display text-[clamp(36px,6vw,76px)] leading-[0.92] font-semibold">
              Trak
              <em className="font-medium text-saffron not-italic italic">.</em>
            </h1>
            <p className="max-w-[420px] text-base leading-relaxed text-paper/72">
              The Digital Learning Unit&apos;s activity &amp; operations register
              — connected end to end.
            </p>
          </div>
        </div>
        <div className="border-t border-paper/14 pt-5 text-xs text-paper/50">
          Sign in with your DLU credentials to continue.
        </div>
      </section>

      <section className="flex min-w-0 flex-1 items-center justify-center bg-paper p-8 md:min-w-[480px] md:p-12">
        <div className="w-full max-w-[480px]">
          <h2 className="m-0 mb-1.5 font-display text-[26px] font-semibold">
            Welcome back
          </h2>
          <p className="mb-6 text-[14.5px] text-ink-soft">
            {showRoster
              ? "Select your profile to auto-fill your credentials, or enter your details manually."
              : "Enter your username and password to continue."}
          </p>

          {showRoster && roster.length > 0 && (
            <>
              <div className="mb-2.5 text-[11.5px] font-bold tracking-widest text-ink-soft uppercase">
                Quick select profile
              </div>
              <div className="mb-6 flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:gap-2.5 sm:overflow-visible sm:pb-0">
                {roster.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => fillUser(u.id)}
                    aria-label={`Select ${u.name} — ${roleLabel(u)}`}
                    aria-pressed={selectedId === u.id}
                    className={cn(
                      "flex w-28 shrink-0 snap-start cursor-pointer flex-col items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-1.5 py-3 transition-colors hover:border-saffron-dim focus-visible:ring-2 focus-visible:ring-saffron focus-visible:outline-none sm:w-auto sm:shrink",
                      selectedId === u.id &&
                        "border-saffron ring-2 ring-saffron/30",
                    )}
                  >
                    <div
                      className="flex h-[38px] w-[38px] items-center justify-center rounded-full font-display text-sm font-semibold text-white"
                      style={{ background: u.color }}
                    >
                      {initials(u.name)}
                    </div>
                    <div className="text-center text-xs font-semibold">
                      {firstName(u.name)}
                    </div>
                    <div className="text-[9.5px] text-ink-faint uppercase">
                      {roleLabel(u) === "Unit Head"
                        ? "Unit Head"
                        : u.isCorps
                          ? "Corps"
                          : u.isSecretary
                            ? "Secretary"
                            : "Member"}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <form action={formAction}>
            {passwordResetNotice && (
              <div
                className="mb-4 rounded-[12px] border border-good/30 bg-good-bg px-3.5 py-3 text-[13px] font-semibold text-good"
                role="status"
                aria-live="polite"
              >
                Password updated. Sign in with your new password.
              </div>
            )}
            <div className="mb-4">
              <label
                htmlFor="loginUser"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
              >
                Username
              </label>
              <input
                id="loginUser"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Auto-filled from your profile"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
                required
              />
            </div>
            <div className="mb-2.5">
              <label
                htmlFor="loginPass"
                className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
              >
                Password
              </label>
              <input
                id="loginPass"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="•••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
                required
              />
            </div>
            {state && !state.ok && (
              <div className="my-2.5 text-[12.5px] font-semibold text-critical" role="alert">
                {state.error}
              </div>
            )}
            <div className="mb-1 flex justify-end">
              <a
                href="/forgot-password"
                className="text-[12.5px] font-bold text-aztec-3 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
              >
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-linear-to-br from-aztec-3 to-aztec py-3.5 text-[14.5px] font-bold text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d={PATHS.login} />
              </svg>
              {pending ? "Signing in…" : "Sign in to Trak"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
