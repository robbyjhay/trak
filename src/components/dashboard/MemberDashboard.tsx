"use client";

import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { addDays, iso, longDateLabel } from "@/lib/dates";
import { firstName } from "@/lib/utils";
import { rampColor } from "@/lib/constants";
import { GhostBtn, PrimaryBtn } from "@/components/ui/Buttons";
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
  const totalYear = activitiesFor(user.id).length;

  return (
    <div>
      <div className="page-head mb-[22px] flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
            {longDateLabel(now)}
          </div>
          <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
            Welcome back, {firstName(user.name)}
          </h1>
          <p className="m-0 text-[13.5px] text-ink-soft">
            {b.pending.length} pending · {completedThisMonth} completed this
            month · {b.missed.length} missed.
          </p>
        </div>
        <div className="flex gap-2.5">
          <GhostBtn onClick={() => router.push("/activities")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.checkList} />
            </svg>
            View Activities
          </GhostBtn>
          <PrimaryBtn onClick={() => router.push("/new-activity")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.plus} />
            </svg>
            New Activity
          </PrimaryBtn>
        </div>
      </div>

      <div className="mb-[26px] grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi kind="pending" value={b.pending.length} label="Pending Activities" path={PATHS.clock} />
        <Kpi kind="completed" value={completedThisMonth} label="Completed This Month" path={PATHS.check} />
        <Kpi kind="missed" value={b.missed.length} label="Missed" path={PATHS.alert} />
        <Kpi kind="neutral" value={totalYear} label="Logged This Year" path={PATHS.chart} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <Card title="Weekly activity" sub="Last 8 weeks">
            <WeeklyChart userId={user.id} />
          </Card>
          <Card title="By responsibility" sub="Last 90 days">
            <RespBars userId={user.id} />
          </Card>
        </div>
        <div>
          <Card title="By activity type" sub="Last 90 days">
            <TypeBars userId={user.id} />
          </Card>
        </div>
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
  const iconBg =
    kind === "pending"
      ? "bg-warning-bg text-warning"
      : kind === "completed"
        ? "bg-good-bg text-good"
        : kind === "missed"
          ? "bg-critical-bg text-critical"
          : "bg-neutral-bg text-neutral";
  return (
    <div className="relative rounded-2xl border border-line bg-card p-5">
      <div className={`mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] ${iconBg}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={path} />
        </svg>
      </div>
      <div className="mb-1.5 text-[30px] leading-none font-extrabold">{value}</div>
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
    </div>
  );
}

function Card({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-[18px] border border-line bg-card px-[26px] py-6 last:mb-0">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[17px] font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {sub && <span className="text-[11.5px] text-ink-faint">{sub}</span>}
          {action}
        </div>
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
      <div className="relative flex h-[120px] items-end gap-2 border-b border-line">
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
            <div className="mt-1.5 text-[9.5px] text-ink-faint">{d.label}</div>
          </div>
        ))}
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-lg bg-aztec px-2.5 py-1.5 text-[11.5px] whitespace-nowrap text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)]"
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
          <div key={name} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>
      {typeOrder.map(([name, color]) => (
        <div key={name} className="mb-3 last:mb-0">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-bold text-ink">{name}</span>
            <span className="font-mono font-bold text-ink-soft">{counts[name]}</span>
          </div>
          <div className="h-3.5 overflow-hidden rounded bg-neutral-bg">
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
          <div className="w-[52px] shrink-0 font-mono text-[9.5px] font-bold text-ink-faint">
            {r.code}
          </div>
          <div className="w-[90px] shrink-0 truncate text-xs font-semibold text-ink-soft sm:w-[150px]">
            {r.name}
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-neutral-bg">
            <div
              className="h-full rounded-sm transition-all duration-600"
              style={{
                width: ready ? `${(r.count / respMax) * 100}%` : "0%",
                background: rampColor(r.count, respMax),
              }}
            />
          </div>
          <div className="w-5 text-right font-mono text-[11.5px] font-bold">
            {r.count}
          </div>
        </div>
      ))}
    </>
  );
}

export { Kpi, Card, WeeklyChart, TypeBars, RespBars };
