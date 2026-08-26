"use client";

import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { addDays, iso } from "@/lib/dates";
import { firstName } from "@/lib/utils";
import { rampColor } from "@/lib/constants";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";
import { useEffect, useState } from "react";

export function MemberDashboard({ user }: { user: User }) {
  const router = useRouter();
  const { now, bucket, activitiesFor } = useTrak();
  const b = bucket(user.id);
  const completedThisMonth = b.completed.filter(
    (a) => a.createdAt >= iso(addDays(now, -30)),
  ).length;
  const loggedTotal = activitiesFor(user.id).length;

  return (
    <div>
      {/* Featured Summary & Greeting */}
      <div
        className="mb-8 rounded-3xl bg-surface p-8 shadow-sm border border-border"
        role="group"
        aria-label="My activity summary"
      >
        {/*
          Mirrors the Unit Performance container structure: story column (heading +
          dynamic summary, Logged pinned bottom on desktop) beside a metric grid with
          identical geometry & box attributes (hero row-span-2 + two slim tiles,
          w-full shrink-0 grid-cols-2 gap-3 lg:w-auto lg:min-w-[420px]).
          Mobile stacks story → Logged banner → hero+split grid.
        */}
        <div className="flex flex-col gap-5 lg:flex-row lg:justify-between lg:gap-8">
          {/* Story & history — summary top-left, Logged bottom-left on desktop */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:justify-between">
            <div>
              <h2 className="mb-3 font-display text-3xl font-semibold text-foreground tracking-tight">
                My Performance
              </h2>
              <p className="m-0 max-w-lg text-[15px] leading-relaxed text-foreground-secondary">
                You have completed{" "}
                <strong className="font-bold text-foreground">{completedThisMonth}</strong>{" "}
                {completedThisMonth === 1 ? "task" : "tasks"} this month.{" "}
                {completedThisMonth === 0
                  ? "Let's get to work and clear those pending items!"
                  : "Great job staying productive!"}
              </p>
            </div>

            {/* Logged · All Time — historical context; capped to the summary's
                text measure on desktop so it doesn't stretch across the column */}
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3 sm:px-5 lg:max-w-lg">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface text-foreground-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.checkList} />
                  </svg>
                </div>
                <span className="truncate text-[13px] font-semibold whitespace-nowrap text-foreground-secondary sm:text-[14px]">
                  Logged · All Time
                </span>
              </div>
              <span className="shrink-0 text-[20px] font-bold tabular-nums text-foreground sm:text-[22px]" aria-label={`${loggedTotal} logged all time`}>
                {loggedTotal}
              </span>
            </div>
          </div>

          {/* Active workspace — same width, breadth & box attributes as Unit Performance metrics */}
          <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-auto lg:min-w-[420px]">
            {/* Completed — hero spanning both rows */}
            <div className="row-span-2 flex flex-col justify-center rounded-2xl border border-success-surface bg-success-surface/40 p-6 shadow-sm">
              <div className="mb-2 text-[36px] leading-none font-extrabold text-foreground">
                {completedThisMonth}
              </div>
              <div className="text-[14px] font-semibold text-good">Completed</div>
            </div>

            {/* Pending / Missed — actionable pair, no icons */}
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-warning-surface bg-warning-surface/40 px-5 py-3.5">
              <span className="text-[14px] font-semibold whitespace-nowrap text-warning-foreground">
                Pending
              </span>
              <span className="text-[22px] font-bold text-warning-foreground" aria-label={`${b.pending.length} pending`}>
                {b.pending.length}
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
        </div>
      </div>

      {/* Primary Showcase Surface */}
      <div className="mb-6">
        <Card title="Weekly activity" sub="Last 8 weeks" large>
          <WeeklyChart userId={user.id} />
        </Card>
      </div>

      {/* Supporting Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="By responsibility" sub="Last 90 days">
          <RespBars userId={user.id} />
        </Card>
        <Card title="By activity type" sub="Last 90 days">
          <TypeBars userId={user.id} />
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  kind,
  value,
  label,
  path,
}: {
  kind: "pending" | "completed" | "missed" | "neutral";
  value: number | string;
  label: string;
  path: string;
}) {
  const isPending = kind === "pending";
  const isCompleted = kind === "completed";
  const isMissed = kind === "missed";

  const cardColors = isPending
    ? "bg-warning-surface/40 border-warning-semantic/30"
    : isCompleted
    ? "bg-success-surface/40 border-success/30"
    : isMissed
    ? "bg-critical-surface/40 border-critical/30"
    : "bg-surface border-border";

  const iconColors = isPending
    ? "bg-warning-surface text-warning-foreground"
    : isCompleted
    ? "bg-success-surface text-success"
    : isMissed
    ? "bg-critical-surface text-critical"
    : "bg-surface-muted text-foreground-secondary";

  const valueColors = isPending
    ? "text-warning-foreground"
    : isCompleted
    ? "text-success"
    : isMissed
    ? "text-critical"
    : "text-foreground";

  return (
    <div className={`relative h-full min-w-0 rounded-2xl border p-5 ${cardColors}`}>
      <div className={`mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] ${iconColors}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={path} />
        </svg>
      </div>
      <div className={`mb-1.5 text-[30px] leading-none font-extrabold tabular-nums ${valueColors}`}>{value}</div>
      <div className={`text-xs font-semibold ${isPending || isCompleted || isMissed ? "opacity-80 " + valueColors : "text-foreground-secondary"}`}>{label}</div>
    </div>
  );
}

export function QuickActionTile({
  icon,
  label,
  onClick,
  primary
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start justify-between p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[110px] ${
        primary
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary-hover shadow-md"
          : "bg-surface text-foreground border-border hover:border-foreground-muted hover:shadow-sm"
      }`}
    >
      <div className={`p-2 rounded-xl mb-3 ${primary ? "bg-primary-foreground/20 text-primary-foreground" : "bg-surface-muted text-foreground-secondary"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={icon} />
        </svg>
      </div>
      <span className="font-semibold text-[14px] leading-tight">{label}</span>
    </button>
  );
}

function Card({
  title,
  sub,
  action,
  children,
  large,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className={`mb-6 rounded-3xl border border-border bg-surface px-7 py-7 last:mb-0 shadow-sm ${large ? '' : ''}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[19px] font-semibold text-foreground">{title}</h2>
          {sub && <div className="mt-1 text-[13px] text-foreground-secondary">{sub}</div>}
        </div>
        {action && (
          <div className="flex flex-wrap items-center gap-3">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function WeeklyChart({ userId }: { userId: string | null }) {
  const { now, activitiesFor, db } = useTrak();
  const acts = userId ? activitiesFor(userId) : db.activities;
  const weekly = [];
  for (let w = 7; w >= 0; w--) {
    const start = addDays(now, -(w * 7 + 6));
    const end = addDays(now, -(w * 7));
    const count = acts.filter(
      (a) => a.createdAt >= iso(start) && a.createdAt <= iso(end),
    ).length;
    weekly.push({
      label: start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
      v: count,
    });
  }
  const maxV = Math.max(1, ...weekly.map((d) => d.v));
  const [tip, setTip] = useState<{ label: string; v: number; x: number } | null>(null);

  return (
    <div className="relative">
      <div className="relative flex h-[120px] items-end gap-2 border-b border-border">
        {weekly.map((d) => (
          <div
            key={d.label}
            className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const parent = e.currentTarget.parentElement!.getBoundingClientRect();
              setTip({
                label: d.label,
                v: d.v,
                x: rect.left - parent.left + rect.width / 2,
              });
            }}
            onMouseLeave={() => setTip(null)}
          >
            <div
              className="w-full max-w-[22px] rounded-t"
              style={{
                height: `${(d.v / maxV) * 100}%`,
                background: rampColor(d.v, maxV),
                minHeight: d.v ? 4 : 0,
              }}
            />
            <div className="mt-1.5 text-[9.5px] text-foreground-faint">{d.label}</div>
          </div>
        ))}
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-lg border border-border-subtle bg-tooltip px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)]"
          style={{ left: tip.x, top: 0 }}
        >
          <b className="text-saffron">{tip.v}</b> activities · week of {tip.label}
        </div>
      )}
    </div>
  );
}

function TypeBars({ userId }: { userId: string | null }) {
  const { now, activitiesFor, db } = useTrak();
  const acts = (userId ? activitiesFor(userId) : db.activities).filter(
    (a) => a.createdAt >= iso(addDays(now, -90)),
  );
  const counts = { Task: 0, Meeting: 0, Program: 0, Project: 0 };
  acts.forEach((a) => {
    counts[a.type] = (counts[a.type] || 0) + 1;
  });
  const typeOrder: [keyof typeof counts, string][] = [
    ["Task", "var(--cat-task)"],
    ["Meeting", "var(--cat-meeting)"],
    ["Program", "var(--cat-program)"],
    ["Project", "var(--cat-project)"],
  ];
  const typeMax = Math.max(1, ...typeOrder.map(([k]) => counts[k]));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
  }, []);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3.5">
        {typeOrder.map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground-secondary">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>
      {typeOrder.map(([name, color]) => (
        <div key={name} className="mb-3 last:mb-0">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-bold text-foreground">{name}</span>
            <span className="font-mono font-bold text-foreground-secondary">{counts[name]}</span>
          </div>
          <div className="h-3.5 overflow-hidden rounded bg-surface-muted">
            <div
              className="h-full rounded-l transition-all duration-500"
              style={{
                width: ready ? `${(counts[name] / typeMax) * 100}%` : "0%",
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function RespBars({ userId }: { userId: string | null }) {
  const { now, activitiesFor, db, responsibilities } = useTrak();
  const acts = (userId ? activitiesFor(userId) : db.activities).filter(
    (a) => a.createdAt >= iso(addDays(now, -90)),
  );
  const counts: Record<string, number> = {};
  acts.forEach((a) =>
    a.responsibilityIds.forEach((rid) => {
      counts[rid] = (counts[rid] || 0) + 1;
    }),
  );
  const rb = responsibilities
  .filter((r) => r.isActive !== false)
    .map((r) => ({ ...r, count: counts[r.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const respMax = Math.max(1, ...rb.map((r) => r.count));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
  }, []);

  return (
    <>
      {rb.map((r) => (
        <div key={r.id} className="mb-3 flex items-center gap-2.5 last:mb-0" title={r.name}>
          <div className="w-[52px] shrink-0 font-mono text-[9.5px] font-bold text-foreground-faint">
            {r.code}
          </div>
          <div className="w-[90px] shrink-0 truncate text-xs font-semibold text-foreground-secondary sm:w-[150px]">
            {r.name}
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-surface-muted">
            <div
              className="h-full rounded-sm transition-all duration-600"
              style={{
                width: ready ? `${(r.count / respMax) * 100}%` : "0%",
                background: rampColor(r.count, respMax),
              }}
            />
          </div>
          <div className="w-5 text-right font-mono text-[11.5px] font-bold text-foreground">
            {r.count}
          </div>
        </div>
      ))}
    </>
  );
}

export { Kpi, Card, WeeklyChart, TypeBars, RespBars };
