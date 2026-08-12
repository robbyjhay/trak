"use client";

import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string | { message?: string };
        message?: string;
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Could not send reset email.";
        setError(msg);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-[12px] border border-good/30 bg-good-bg px-4 py-3.5 text-[13.5px] leading-relaxed text-good"
        role="status"
        aria-live="polite"
      >
        If an account with that username or email exists and has email on file,
        a reset link has been sent. Check your inbox (and spam folder).
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label
          htmlFor="forgotIdentifier"
          className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
        >
          Username or email
        </label>
        <input
          id="forgotIdentifier"
          name="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="your.username or you@example.gov.ng"
          required
          className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
        />
      </div>

      {error && (
        <div
          className="mb-3 text-[12.5px] font-semibold text-critical"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !identifier.trim()}
        className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-linear-to-br from-aztec-3 to-aztec py-3.5 text-[14.5px] font-bold text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
