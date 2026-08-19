"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({ token }: { token: string }) {
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
      const res = await fetch("/api/auth/invite/accept", {
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
            : data.error?.message || "Could not accept invite.";
        setError(msg);
        return;
      }
      router.push("/dashboard");
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
          htmlFor="aiPass"
          className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-foreground-secondary uppercase"
        >
          New password
        </label>
        <input
          id="aiPass"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-3.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="aiConfirm"
          className="mb-2.5 block text-[11.5px] font-bold tracking-widest text-foreground-secondary uppercase"
        >
          Confirm password
        </label>
        <input
          id="aiConfirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the new password"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-3.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary/40"
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
        className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-xl border-none bg-primary py-3.5 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {pending ? "Activating…" : "Set password & enter Trak"}
      </button>
    </form>
  );
}
