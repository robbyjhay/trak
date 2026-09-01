"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { iso, addDays } from "@/lib/dates";
import { roleLabel } from "@/lib/permissions";
import { initials, firstName } from "@/lib/utils";
import { ActRow } from "@/components/activity/ActRow";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { useReportPreview } from "@/components/reports/ReportPreview";

export function PersonActivities({ userId }: { userId: string }) {
  const router = useRouter();
  const { sessionUser, userMap, bucket, now, activitiesFor, approveException, rejectException, showToast } = useTrak();
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

  const items = b[tab];

  const getContextMessage = () => {
    const name = firstName(person.name);
    const todayStr = iso(now);
    const hasToday = activitiesFor(person.id).some((a) => a.createdAt.startsWith(todayStr));
    
    if (!hasToday) {
      const yesterdayStr = iso(addDays(now, -1));
      const missedYesterday = b.missed.filter((a) => a.createdAt.startsWith(yesterdayStr)).length;
      if (missedYesterday > 0) {
        return isSelf
          ? `You missed ${missedYesterday} ${missedYesterday === 1 ? 'activity' : 'activities'} yesterday. Start today by logging one and keep your progress moving.`
          : `${name} missed ${missedYesterday} ${missedYesterday === 1 ? 'activity' : 'activities'} yesterday. They haven't logged anything today.`;
      }
      return isSelf
        ? "You haven't logged an activity today. Start by logging one."
        : `${name} hasn't logged an activity today.`;
    }

    if (b.pending.length > 0) {
      return isSelf
        ? `You have ${b.pending.length} pending ${b.pending.length === 1 ? 'activity' : 'activities'}. Keep them moving.`
        : `${name} has ${b.pending.length} pending ${b.pending.length === 1 ? 'activity' : 'activities'}.`;
    }
    
    return isSelf
      ? "Nice work. You've completed your activity today. Keep it going."
      : `${name} has completed their activity today.`;
  };

  const summaryHeading = (() => {
    if (b.missed.length > 0) return <><strong className="font-extrabold">{b.missed.length}</strong> {b.missed.length === 1 ? "Missed Activity" : "Missed Activities"}</>;
    if (b.pending.length > 0) return <><strong className="font-extrabold">{b.pending.length}</strong> {b.pending.length === 1 ? "Pending Activity" : "Pending Activities"}</>;
    return <><strong className="font-extrabold">{b.completed.length}</strong> {b.completed.length === 1 ? "Completed Activity" : "Completed Activities"}</>;
  })();

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
        <div>
          {!isSelf && (
            <div className="mb-1 text-[11.5px] font-bold tracking-[0.12em] text-ink-soft uppercase">
              Viewing as Unit Head — read only
            </div>
          )}
          <h1 className="m-0 mb-1 text-[30px] font-semibold tracking-tight text-foreground">
            {summaryHeading}
          </h1>
          <p className="m-0 text-[14.5px] text-foreground-secondary">
            {getContextMessage()}
          </p>
        </div>
        {isSelf && (
          <div className="hidden md:block">
            <PrimaryBtn onClick={() => router.push("/new-activity")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.plus} />
              </svg>
              Create Activity
            </PrimaryBtn>
          </div>
        )}
      </div>

      <div className="mb-[26px] grid w-full shrink-0 grid-cols-2 gap-3 lg:w-auto lg:min-w-[420px]">
        {/* Pending — hero spanning both rows */}
        <div className="row-span-2 flex flex-col justify-center rounded-2xl border border-warning-surface bg-warning-surface/40 p-6 shadow-sm">
          <div className="mb-2 text-[36px] leading-none font-extrabold text-foreground">
            {b.pending.length}
          </div>
          <div className="text-[14px] font-semibold text-warning-foreground">Pending</div>
        </div>

        {/* Completed / Missed — smaller cards */}
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-success-surface bg-success-surface/40 px-5 py-3.5">
          <span className="text-[14px] font-semibold whitespace-nowrap text-success">
            Completed
          </span>
          <span className="text-[22px] font-bold text-success" aria-label={`${b.completed.length} completed`}>
            {b.completed.length}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-critical-surface bg-critical-surface/40 px-5 py-3.5">
          <span className="text-[14px] font-semibold whitespace-nowrap text-critical">
            Missed
          </span>
          <span className="text-[22px] font-bold text-critical" aria-label={`${b.missed.length} missed`}>
            {b.missed.length}
          </span>
        </div>
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
            <div className="flex flex-col gap-1 py-8 text-center text-[13px] text-ink-faint">
              {tab === "missed"
                ? <span>Nothing missed — nice work.</span>
                : tab === "pending"
                  ? (
                    <>
                      <span>Nothing pending right now.</span>
                      {isSelf && <span className="md:hidden">Tap the + button to create your first activity.</span>}
                    </>
                  )
                  : <span>Nothing completed yet.</span>}
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
              <div key={a.id} className="flex flex-col gap-2">
                <ActRow key={a.id} activity={a} onReport={openReport} hideStatus={tab === "completed"} index={idx} />
                {tab === "missed" && isHead && !isSelf && a.exceptionStatus === "requested" && (
                  <div className="rounded-[13px] border border-warning-semantic/40 bg-warning-surface/40 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-warning-foreground">
                        Exception requested — review
                      </span>
                      <span className="text-[11px] text-foreground-faint">
                        {a.exceptionReason || "No explanation given"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          approveException(a.id)
                            .then(() => showToast("Exception approved", "2-hour grace period granted."))
                            .catch(() => showToast("Could not approve", "Please try again."))
                        }
                        className="cursor-pointer rounded-[9px] border-none bg-success px-3.5 py-1.5 text-[12px] font-bold text-success-foreground hover:opacity-90 transition-opacity"
                      >
                        Approve (2 hrs)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          rejectException(a.id)
                            .then(() => showToast("Exception rejected", "The member has been notified."))
                            .catch(() => showToast("Could not reject", "Please try again."))
                        }
                        className="cursor-pointer rounded-[9px] border-none bg-critical-semantic px-3.5 py-1.5 text-[12px] font-bold text-critical-foreground hover:opacity-90 transition-opacity"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
