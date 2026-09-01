"use client";

import { useRouter } from "next/navigation";
import { TypeIcon } from "@/components/icons";
import { TYPE_COLOR } from "@/lib/constants";
import { daysBetween, fmtDateShort, fmtTime } from "@/lib/dates";
import { firstName } from "@/lib/utils";
import type { Activity, User } from "@/lib/types";
import { useTrak } from "@/context/TrakStore";
import { PATHS } from "@/components/icons";
import { GraceCountdown } from "./GraceCountdown";

export function ActRow({
  activity,
  onReport,
  hideStatus,
  index = 0,
}: {
  activity: Activity;
  onReport?: (id: string) => void;
  hideStatus?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const { db, userMap } = useTrak();
  const a = activity;
  const days = daysBetween(a.startDate, a.endDate) + 1;

  let dayTag: React.ReactNode = null;
  if (days > 1 && a.status !== "completed") {
    const logs = db.dailyLogs
      .filter((l) => l.activityId === a.id)
      .sort((x, y) => x.date.localeCompare(y.date));
    const doneN = logs.filter((l) => l.status === "submitted").length;
    dayTag = (
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-foreground-secondary uppercase">
        Day {Math.min(doneN + 1, days)} of {days}
      </span>
    );
  }

  let metaLine = "";
  if (days > 1) {
    metaLine = `${fmtDateShort(a.startDate)}–${fmtDateShort(a.endDate)}`;
  } else {
    const actDate = new Date(a.startDate + "T" + (a.startTime || "00:00"));
    const now = new Date();
    if (actDate.toDateString() === now.toDateString() && a.status === "pending" && actDate > now) {
      const diffMins = Math.floor((actDate.getTime() - now.getTime()) / 60000);
      if (diffMins < 60) metaLine = `Today, in ${diffMins} mins`;
      else metaLine = `Today, in ${Math.floor(diffMins / 60)} hrs`;
    } else {
      metaLine = `${fmtDateShort(a.startDate)} · ${fmtTime(a.startTime)}`;
    }
  }

  const statusText =
    a.status === "pending"
      ? days > 1
        ? "In progress"
        : "Not started"
      : a.status === "completed"
        ? a.submissionType === "late" ? "Completed · Late" : "Completed"
        : "Missed";

  const statusCls =
    a.status === "pending"
      ? "bg-warning-surface text-warning-foreground"
      : a.status === "completed"
        ? a.submissionType === "late"
          ? "bg-success-surface text-success"
          : "bg-success-surface text-success"
        : "bg-critical-surface text-critical-semantic";

  return (
    <div
      role="button"
      tabIndex={0}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group flex cursor-pointer flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[13px] border border-border bg-surface px-4 py-3.5 transition-all hover:-translate-y-px hover:border-primary hover:shadow-[0_6px_16px_rgba(13,29,26,0.06)] animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
      onClick={() => router.push(`/activity/${a.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/activity/${a.id}`);
        }
      }}
    >
      <div
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
        style={{ background: TYPE_COLOR[a.type] }}
      >
        <TypeIcon type={a.type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <div className="truncate min-w-0 text-[13.5px] font-bold">{a.title}</div>
          {a.hidden && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-1.5 py-0.5 text-[9.5px] font-bold text-foreground-secondary border border-border" title="Hidden from unit feed">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.eyeOff} />
              </svg>
              Hidden
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-foreground-faint">
          <span>{a.type}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-foreground-faint" />
          <span>{metaLine}</span>
          {dayTag}
          <GraceCountdown activity={a} variant="pill" />
          {a.delegatedBy && (
            <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-warning-foreground uppercase">
              Delegated by{" "}
              {a.delegatedBy === "babajide"
                ? "Unit Head"
                : firstName((userMap[a.delegatedBy] as User)?.name || "Unit Head")}
            </span>
          )}
          {a.hasBudget && (
            <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-warning-foreground uppercase">
              Budget
            </span>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        {!hideStatus && (
          <div
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusCls}`}
          >
            {statusText}
          </div>
        )}
        {a.status === "completed" && onReport && (
          <button
            type="button"
            title="Preview & download report"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-border bg-surface text-foreground-secondary hover:border-primary hover:bg-surface-hover hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onReport(a.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.download} />
            </svg>
          </button>
        )}
        <div className="shrink-0 text-foreground-faint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.chevronRight} />
          </svg>
        </div>
      </div>
    </div>
  );
}
