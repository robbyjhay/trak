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
      <div>
        <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
          New Default Password
        </label>
        <input
          name="password"
          type="password"
          placeholder="At least 12 characters"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-[10px] border-[1.5px] border-line bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-aztec-3"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
          Confirm Password
        </label>
        <input
          name="confirm"
          type="password"
          placeholder="Repeat password"
          minLength={12}
          maxLength={128}
          required
          className="w-full rounded-[10px] border-[1.5px] border-line bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-aztec-3"
        />
      </div>
      
      {state?.error && (
        <div className="rounded-lg bg-critical-bg px-3 py-2 text-[12px] font-semibold text-critical">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white transition-colors hover:bg-aztec-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Default Password"}
      </button>
    </form>
  );
}
