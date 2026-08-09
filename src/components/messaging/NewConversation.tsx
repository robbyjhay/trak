"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { roleLabel } from "@/lib/permissions";
import { initials } from "@/lib/utils";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";

export function NewConversation({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
}) {
  const { sessionUser, users } = useTrak();
  const me = sessionUser.id;
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const matches = users.filter(
    (u) =>
      u.id !== me &&
      (u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)),
  );

  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <ModalPanel className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-display text-[20px] font-semibold">
            New conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-xl text-ink-soft hover:bg-neutral-bg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people…"
          className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5 text-[13px]"
          aria-label="Search people"
          autoFocus
        />
        <div className="mt-3 flex max-h-[360px] flex-col overflow-y-auto">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-faint">
              No one matches “{search}”.
            </div>
          ) : (
            matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-none p-2.5 text-left hover:bg-neutral-bg"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white"
                  style={{ background: p.color }}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{p.name}</div>
                  <div className="truncate text-[11px] text-ink-faint">
                    {roleLabel(p)} · {p.username}
                  </div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-faint">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))
          )}
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
