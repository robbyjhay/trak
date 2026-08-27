"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { roleLabel } from "@/lib/permissions";
import { initials, firstName } from "@/lib/utils";
import { ActRow } from "@/components/activity/ActRow";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { useReportPreview } from "@/components/reports/ReportPreview";
import { Kpi } from "@/components/dashboard/MemberDashboard";

export function PersonActivities({ userId }: { userId: string }) {
  const router = useRouter();
  const { sessionUser, userMap, bucket } = useTrak();
  const { openReport } = useReportPreview();
  const person = userMap[userId] || sessionUser;
  const isSelf = person.id === sessionUser.id;
  const isHead = sessionUser.role === "head";
  const rawBucket = bucket(person.id);
  const b = {
    pending: rawBucket.pending.filter((a) => isHead || !a.hidden),
    completed: rawBucket.completed.filter((a) => isHead || !a.hidden),
    missed: rawBucket.missed.filter((a) => isHead || !a.hidden),
  };
  const [tab, setTab] = useState<"pending" | "completed" | "missed">("pending");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const items = b[tab];

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-white"
            style={{ background: person.color }}
          >
            {initials(person.name)}
          </div>
          <div>
            <div className="mb-1 text-[11.5px] font-bold tracking-[0.12em] text-ink-soft uppercase">
              {isSelf ? "My Activities" : "Viewing as Unit Head — read only"}
            </div>
            <h1 className="m-0 mb-1 text-[30px] font-semibold">
              {isSelf ? `${greeting}, ${firstName(person.name)}` : `${person.name}'s activities`}
            </h1>
            <p className="m-0 text-[13.5px] text-ink-soft">
              {roleLabel(person)} · {person.username}
            </p>
          </div>
        </div>
        {isSelf && (
          <PrimaryBtn onClick={() => router.push("/new-activity")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.plus} />
            </svg>
            Create Activity
          </PrimaryBtn>
        )}
      </div>

      <div className="mb-[26px] grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi kind="pending" value={b.pending.length} label="Pending Activities" path={PATHS.clock} />
        <Kpi kind="completed" value={b.completed.length} label="Completed Activities" path={PATHS.check} />
        <Kpi kind="missed" value={b.missed.length} label="Missed Activities" path={PATHS.alert} />
      </div>

      <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
        <div className="mb-[18px] flex w-fit gap-1.5 rounded-[11px] bg-surface-muted p-1">
          {(
            [
              ["pending", "Pending", b.pending.length],
              ["completed", "Completed", b.completed.length],
              ["missed", "Missed", b.missed.length],
            ] as const
          ).map(([key, label, cnt]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`cursor-pointer rounded-lg border-none px-4 py-2 text-[12.5px] font-bold transition-colors ${
                tab === key
                  ? key === "pending"
                    ? "bg-warning-surface text-warning-foreground shadow-sm ring-1 ring-warning-semantic/30"
                    : key === "completed"
                    ? "bg-success-surface text-success shadow-sm ring-1 ring-success/30"
                    : key === "missed"
                    ? "bg-critical-surface text-critical shadow-sm ring-1 ring-critical/30"
                    : "bg-surface text-foreground shadow-sm ring-1 ring-border"
                  : "bg-transparent text-foreground-secondary hover:text-foreground hover:bg-surface-hover/50"
              }`}
            >
              {label} <span className="ml-0.5 opacity-60">({cnt})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {!items.length ? (
            <div className="py-8 text-center text-[13px] text-ink-faint">
              {tab === "missed"
                ? "Nothing missed — nice work."
                : tab === "pending"
                  ? "Nothing pending right now."
                  : "Nothing completed yet."}
            </div>
          ) : tab === "pending" ? (
            <>
              {(() => {
                const selfCreated = items.filter((a) => !a.delegatedBy);
                const delegated = items.filter((a) => a.delegatedBy);
                return (
                  <>
                    {selfCreated.length > 0 && (
                      <>
                        <div className="mt-0.5 mb-2.5 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
                          Self Created Activities ({selfCreated.length})
                        </div>
                        {selfCreated.map((a, idx) => (
                          <ActRow key={a.id} activity={a} onReport={openReport} index={idx} />
                        ))}
                      </>
                    )}
                    {delegated.length > 0 && (
                      <>
                        <div className="mt-[18px] mb-2.5 text-[11px] font-bold tracking-wider text-ink-faint uppercase">
                          Delegated Activities ({delegated.length})
                        </div>
                        {delegated.map((a, idx) => (
                          <ActRow key={a.id} activity={a} onReport={openReport} index={idx} />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            items.map((a, idx) => (
              <ActRow key={a.id} activity={a} onReport={openReport} hideStatus={tab === "completed"} index={idx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
