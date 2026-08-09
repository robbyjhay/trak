"use client";

import { useState } from "react";
import { RESPONSIBILITIES } from "@/lib/mockDb";
import { PATHS } from "@/components/icons";

export function RespManageList() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      {RESPONSIBILITIES.map((r) => {
        const open = openId === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpenId(open ? null : r.id)}
            className="mb-2.5 w-full cursor-pointer rounded-[13px] border border-line px-4 py-3.5 text-left transition-colors last:mb-0 hover:border-saffron-dim"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 rounded-md bg-aztec-3 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {r.code}
                </span>
                <span className="truncate text-[13px] font-bold">{r.name}</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-90" : ""}`}
              >
                <path d={PATHS.chevronRight} />
              </svg>
            </div>
            {open && (
              <div className="mt-3 border-t border-dashed border-line pt-3 text-xs leading-relaxed text-ink-soft">
                {r.desc}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.deliverables.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-neutral-bg px-2.5 py-0.5 text-[10px] text-ink-soft"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
