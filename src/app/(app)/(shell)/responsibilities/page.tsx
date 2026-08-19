"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { RespManageList } from "@/components/activity/RespManageList";
import { RespFormModal } from "@/components/activity/RespFormModal";
import { GhostBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";

export default function ResponsibilitiesPage() {
  const { sessionUser } = useTrak();
  const isHead = sessionUser.role === "head";
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-foreground-secondary uppercase">
            Digital Learning Unit
          </div>
          <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
            Responsibilities
          </h1>
          <p className="m-0 text-[13.5px] text-foreground-secondary">
            {isHead
              ? "Create and edit the unit's official responsibilities."
              : "The unit's official responsibilities — every activity links to at least one."}
          </p>
        </div>
        {isHead && (
          <GhostBtn onClick={() => setAdding(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.plus} />
            </svg>
            Add Responsibility
          </GhostBtn>
        )}
      </div>
      <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
        <RespManageList />
      </div>
      {adding && (
        <RespFormModal
          open
          onClose={() => setAdding(false)}
          existing={null}
        />
      )}
    </div>
  );
}
