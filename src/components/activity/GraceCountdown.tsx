"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/lib/types";
import { PATHS } from "@/components/icons";

/**
 * Live countdown to an approved exception's grace-period deadline.
 * Source of truth is the server-persisted `gracePeriodExpiresAt` on the
 * activity, so the countdown survives page reloads and matches the backend.
 *
 * Render variants:
 *  - "pill": compact value (e.g. "⏱ 1h 23m left") for list rows.
 *  - "banner": fuller value (e.g. "1h 23m 45s") for headers/modals.
 */
export function GraceCountdown({
  activity,
  variant = "pill",
  className,
}: {
  activity: Activity;
  variant?: "pill" | "banner";
  className?: string;
}) {
  const target = activity.gracePeriodExpiresAt
    ? new Date(activity.gracePeriodExpiresAt)
    : null;
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setRemainingMs(null);
      return;
    }
    const tick = () => {
      const diff = target.getTime() - Date.now();
      setRemainingMs(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const active =
    activity.status === "missed" &&
    activity.exceptionStatus === "approved" &&
    target != null &&
    remainingMs !== null &&
    remainingMs > 0;

  const expired =
    activity.exceptionStatus === "approved" &&
    target != null &&
    remainingMs !== null &&
    remainingMs <= 0;

  if (!active && !expired) return null;

  const seconds = active && remainingMs !== null ? Math.ceil(remainingMs / 1000) : 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const isLow = active && remainingMs !== null && remainingMs <= 10 * 60 * 1000;
  const isCrit = active && remainingMs !== null && remainingMs <= 2 * 60 * 1000;

  const pillText = active
    ? h > 0
      ? `${h}h ${m}m left`
      : `${m}m ${s}s left`
    : "Grace Period Expired";
  const bannerText = active
    ? `${h}h ${m}m ${s}s remaining`
    : "Grace Period Expired";

  if (variant === "banner") {
    const cls = expired
      ? "border-border bg-surface-muted text-foreground-secondary"
      : isCrit
        ? "border-critical/50 bg-critical-surface/60 text-critical"
        : "border-success/40 bg-success-surface/50 text-success";
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-[11px] border px-3 py-2 text-[13px] font-bold tracking-wide ${cls} ${className ?? ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d={PATHS.clock} />
        </svg>
        <span>
          {active ? "Late submission window — " : ""}
          <span className="font-mono">{bannerText}</span>
        </span>
      </div>
    );
  }

  const pillCls = expired
    ? "bg-surface-muted text-foreground-faint border border-border"
    : isCrit
      ? "bg-critical-surface text-critical"
      : isLow
        ? "bg-warning-surface text-warning-foreground"
        : "bg-warning-surface/70 text-warning-foreground";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${pillCls} ${className ?? ""}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d={PATHS.clock} />
      </svg>
      <span className="font-mono">{pillText}</span>
    </span>
  );
}