"use client";

import { useActionState, useEffect } from "react";
import { updateDefaultPasswordAction } from "@/lib/auth/actions";
import { useTrak } from "@/context/TrakStore";

export function DefaultPasswordForm() {
  const [state, formAction, pending] = useActionState(updateDefaultPasswordAction, null);
  const { showToast } = useTrak();

  useEffect(() => {
    if (state?.ok) {
      showToast("Settings updated", "The default member password has been changed.");
      const form = document.getElementById("default-password-form") as HTMLFormElement;
      if (form) form.reset();
    }
  }, [state, showToast]);

  return (
    <form id="default-password-form" action={formAction} className="flex flex-col gap-4">
      <div className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Used as the temporary password for newly created members. Members are required to set their own password when they first sign in. Changing this value does not affect existing members.
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-foreground-secondary uppercase">
          New Default Password
        </label>
        <input
          name="password"
          type="password"
          placeholder="At least 12 characters"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-2.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-border-strong focus:ring-1 focus:ring-border"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-foreground-secondary uppercase">
          Confirm Password
        </label>
        <input
          name="confirm"
          type="password"
          placeholder="Repeat password"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-xl border-[1.5px] border-input-border bg-input px-3.5 py-2.5 text-[14.5px] text-foreground outline-none placeholder:text-input-placeholder focus:border-border-strong focus:ring-1 focus:ring-border"
        />
      </div>
      
      {state?.error && (
        <div className="rounded-lg bg-critical/10 px-3 py-2 text-[12.5px] font-semibold text-critical">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Default Password"}
      </button>
    </form>
  );
}
