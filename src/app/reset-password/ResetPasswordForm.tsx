"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string | { message?: string };
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Could not reset password.";
        setError(msg);
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <label
          htmlFor="rpPass"
          className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
        >
          New password
        </label>
        <input
          id="rpPass"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3.5 text-[14.5px] outline-none placeholder:text-ink-soft focus:border-aztec-3 focus:ring-2 focus:ring-saffron/60"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="rpConfirm"
          className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-ink-soft uppercase"
        >
          Confirm password
        </label>
        <input
          id="rpConfirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the new password"
          minLength={12}
          maxLength={128}
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
        disabled={pending}
        className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-xl border-none bg-linear-to-br from-aztec-3 to-aztec py-3.5 text-[14.5px] font-bold text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
