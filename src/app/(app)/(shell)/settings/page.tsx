"use client";

import { useTheme } from "@/context/ThemeContext";

export default function SettingsPage() {
  const { theme, preview, setTheme, saveTheme, cancelPreview } = useTheme();

  return (
    <div>
      <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
        Trak
      </div>
      <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
        Settings
      </h1>
      <p className="m-0 text-[13.5px] text-muted-foreground">
        Account, notification and security settings land here in a later phase.
      </p>

      <div className="mt-10 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 font-display text-[20px] font-semibold">
          Appearance
        </h2>
        <div className="flex flex-col gap-3">
          {( ["light", "dark", "system"] as const).map((t) => (
            <label key={t} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value={t}
                checked={preview === t}
                onChange={() => setTheme(t)}
                className="h-4 w-4 text-primary focus:ring-primary border-border"
              />
              <span className="text-[14px] font-medium capitalize">
                {t}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveTheme()}
            disabled={preview === theme}
            className="inline-flex items-center gap-2 rounded-md bg-saffron px-3 py-2 text-sm font-semibold text-aztec disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => cancelPreview()}
            disabled={preview === theme}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="ml-4 text-sm text-muted-foreground">
            Selecting a theme previews it; click Save to persist.
          </div>
        </div>
      </div>
    </div>
  );
}
