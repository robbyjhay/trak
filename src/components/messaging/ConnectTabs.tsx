"use client";

import { cn } from "@/lib/utils";
import { useConnectNav } from "@/context/ConnectNav";

const TABS: Array<["messages" | "contacts", string]> = [
  ["messages", "Messages"],
  ["contacts", "Contacts"],
];

export function ConnectTabs({ className }: { className?: string }) {
  const { view, setView } = useConnectNav();
  return (
    <div
      className={cn(
        "flex w-fit gap-1.5 rounded-[11px] bg-neutral-bg p-1",
        className,
      )}
    >
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          className={`cursor-pointer rounded-lg border-none px-4 py-2 text-[12.5px] font-bold ${
            view === key
              ? "bg-card text-ink shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
              : "bg-transparent text-ink-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
