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
    <ModalBackdrop open={open} onClose={onClose} bottomSheetOnMobile={true}>
      <ModalPanel className="p-6" bottomSheetOnMobile={true}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-display text-[20px] font-semibold text-foreground">
            New conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-xl text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
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
          className="w-full rounded-[10px] border-[1.5px] border-input-border bg-input px-3.5 py-2.5 text-[13px] text-foreground placeholder-input-placeholder outline-none focus:border-border-strong"
          aria-label="Search people"
          autoFocus
        />
        <div className="mt-3 flex max-h-[360px] flex-col overflow-y-auto">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-foreground-faint">
              No one matches “{search}”.
            </div>
          ) : (
            matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent p-2.5 text-left text-foreground hover:bg-surface-hover transition-colors"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white"
                  style={{ background: p.color }}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-foreground">{p.name}</div>
                  <div className="truncate text-[11px] text-foreground-faint">
                    {roleLabel(p)} · {p.username}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
