"use client";

import { useRouter } from "next/navigation";
import { TypeIcon } from "@/components/icons";
import { TYPE_COLOR } from "@/lib/constants";
import { daysBetween, fmtDateShort, fmtTime } from "@/lib/dates";
import { firstName } from "@/lib/utils";
import type { Activity, User } from "@/lib/types";
import { useTrak } from "@/context/TrakStore";
import { PATHS } from "@/components/icons";

export function ActRow({
  activity,
  onReport,
}: {
  activity: Activity;
  onReport?: (id: string) => void;
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
      <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-neutral uppercase">
        Day {Math.min(doneN + 1, days)} of {days}
      </span>
    );
  }

  const metaLine =
    days > 1
      ? `${fmtDateShort(a.startDate)}–${fmtDateShort(a.endDate)}`
      : `${fmtDateShort(a.startDate)} · ${fmtTime(a.startTime)}`;

  const statusText =
    a.status === "pending"
      ? days > 1
        ? "In progress"
        : "Not started"
      : a.status === "completed"
        ? "Completed"
        : "Missed";

  const statusCls =
    a.status === "pending"
      ? "bg-warning-bg text-warning-ink"
      : a.status === "completed"
        ? "bg-good-bg text-good"
        : "bg-critical-bg text-critical";

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[13px] border border-line px-4 py-3.5 transition-all hover:-translate-y-px hover:border-saffron-dim hover:shadow-[0_6px_16px_rgba(13,29,26,0.06)]"
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
        <div className="mb-0.5 truncate text-[13.5px] font-bold">{a.title}</div>
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-faint">
          <span>{a.type}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-ink-faint" />
          <span>{metaLine}</span>
          {dayTag}
          {a.delegatedBy && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-warning-ink uppercase">
              Delegated by{" "}
              {a.delegatedBy === "babajide"
                ? "Head"
                : firstName((userMap[a.delegatedBy] as User)?.name || "Head")}
            </span>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusCls}`}
        >
          {statusText}
        </div>
        {a.status === "completed" && onReport && (
          <button
            type="button"
            title="Preview & download report"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-line bg-white text-ink-soft hover:border-saffron-dim hover:bg-[#fffaf0] hover:text-saffron-dim"
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
        <div className="shrink-0 text-ink-faint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.chevronRight} />
          </svg>
        </div>
      </div>
    </div>
  );
}
