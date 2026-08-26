"use client";

import { useActionState, useEffect, useState } from "react";
import { updatePreferencesAction } from "./actions";
import { Switch } from "@/components/ui/Switch";

export function NotificationForm({ initialPrefs }: { initialPrefs: any }) {
  const [state, formAction, pending] = useActionState(updatePreferencesAction, null);
  const [success, setSuccess] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(initialPrefs.notificationsEnabled ?? true);

  useEffect(() => {
    if (state?.ok) {
      setSuccess(true);
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && !state.ok && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          Preferences saved.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="pr-4">
          <label htmlFor="notificationsEnabled" className="font-semibold text-[14px]">
            Enable All Notifications
          </label>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Master toggle for all app notifications.
          </p>
        </div>
        <Switch
          id="notificationsEnabled"
          name="notificationsEnabled"
          defaultChecked={initialPrefs.notificationsEnabled ?? true}
          onChange={(checked) => setMasterEnabled(checked)}
        />
      </div>

      <hr className="border-border" />

      <div className={`space-y-6 ${!masterEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <label htmlFor="activityNotifications" className="font-medium text-[14px]">
              Activity Updates
            </label>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Get notified when activities are created, updated, or missed.
            </p>
          </div>
          <Switch
            id="activityNotifications"
            name="activityNotifications"
            defaultChecked={initialPrefs.activityNotifications ?? true}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <label htmlFor="dmNotifications" className="font-medium text-[14px]">
              Direct Messages
            </label>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Get notified when someone sends you a direct message.
            </p>
          </div>
          <Switch
            id="dmNotifications"
            name="dmNotifications"
            defaultChecked={initialPrefs.dmNotifications ?? true}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <label htmlFor="emailNotifications" className="font-medium text-[14px]">
              Email Notifications
            </label>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Receive notifications via email (currently only applies to critical alerts).
            </p>
          </div>
          <Switch
            id="emailNotifications"
            name="emailNotifications"
            defaultChecked={initialPrefs.emailNotifications ?? true}
          />
        </div>
        
        {/* Unit broadcasts are mandatory, no toggle provided */}
        <div className="flex items-center justify-between pt-2">
          <div className="pr-4">
            <div className="font-medium text-[14px]">Unit Broadcasts</div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              You will always receive important announcements from your Unit Head.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <button type="submit" disabled={pending} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60">{pending ? "Saving…" : "Save Preferences"}</button>
      </div>
    </form>
  );
}
