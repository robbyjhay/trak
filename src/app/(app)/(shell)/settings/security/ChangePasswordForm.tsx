"use client";

import { useActionState, useEffect, useState } from "react";

import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSuccess(true);
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && !state.ok && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          Password updated successfully.
        </div>
      )}

      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Current Password
        </label>
        <input
          type="password"
          id="currentPassword"
          name="currentPassword"
          required
          disabled={pending}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] shadow-inner focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          New Password
        </label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          required
          disabled={pending}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] shadow-inner focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          required
          disabled={pending}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] shadow-inner focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="mt-2">
        <button type="submit" disabled={pending} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60">{pending ? "Changing…" : "Change Password"}</button>
      </div>
    </form>
  );
}
