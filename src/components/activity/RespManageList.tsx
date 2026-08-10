"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { GhostBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { RespFormModal } from "@/components/activity/RespFormModal";

export function RespManageList() {
  const { responsibilities, sessionUser, deactivateResponsibility, showToast } = useTrak();
  const isHead = sessionUser.role === "head";
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const editing = responsibilities.find((r) => r.id === editId) || null;

  return (
    <div>
      {responsibilities.map((r) => {
        const open = openId === r.id;
        return (
          <div
            key={r.id}
            className="mb-2.5 rounded-[13px] border border-line transition-colors last:mb-0 hover:border-saffron-dim"
          >
            <div className="flex items-center justify-between gap-2.5 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
              >
                <span className="shrink-0 rounded-md bg-aztec-3 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {r.code}
                </span>
                <span className="truncate text-[13px] font-bold">{r.name}</span>
              </button>
              <div className="flex shrink-0 items-center gap-2.5">
                {isHead && (
                  <>
                    <GhostBtn
                      className="px-2.5 py-1 text-[11px]"
                      onClick={() => setEditId(r.id)}
                    >
                      Edit
                    </GhostBtn>
                    <button
                      type="button"
                      onClick={() => {
                        void deactivateResponsibility(r.id)
                          .then(() =>
                            showToast(
                              r.isActive !== false
                                ? "Responsibility deactivated"
                                : "Responsibility reactivated",
                              r.isActive !== false
                                ? `"${r.name}" is no longer assigned to unit members.`
                                : `"${r.name}" is now available for assignment.`,
                            ),
                          )
                          .catch(() =>
                            showToast("Could not update", "Please try again."),
                          );
                      }}
                      className={`cursor-pointer rounded-full border-[1.5px] px-2.5 py-0.5 text-[10.5px] font-bold transition-colors ${
                        r.isActive !== false
                          ? "border-line bg-transparent text-ink-faint hover:border-saffron-dim"
                          : "border-saffron bg-[#fff8e6] text-saffron-dim"
                      }`}
                    >
                      {r.isActive !== false ? "Deactivate" : "Inactive"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="cursor-pointer border-none bg-transparent p-0"
                  aria-label={open ? "Collapse" : "Expand"}
                >
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
                </button>
              </div>
            </div>
            {open && (
              <div className="mx-4 mb-3.5 border-t border-dashed border-line pt-3 text-xs leading-relaxed text-ink-soft">
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
          </div>
        );
      })}
      {editing && (
        <RespFormModal
          key={editing.id}
          open
          onClose={() => setEditId(null)}
          existing={editing}
        />
      )}
    </div>
  );
}
