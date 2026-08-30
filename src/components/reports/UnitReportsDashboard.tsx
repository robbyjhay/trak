"use client";

import { useState, useMemo } from "react";
import { useTrak } from "@/context/TrakStore";
import { addDays, iso, fmtDate } from "@/lib/dates";
import { PATHS } from "@/components/icons";
import { Card, TypeBars, RespBars } from "@/components/dashboard/MemberDashboard";
import { buildUnitReportHTML, downloadReportDoc } from "@/lib/reports/buildReport";
import { firstName, initials } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function UnitReportsDashboard() {
  const router = useRouter();
  const { db, users, userMap, responsibilities, now, showToast } = useTrak();
  const [period, setPeriod] = useState<"30D" | "3M" | "YTD" | "ALL">("30D");

  const startDate = useMemo(() => {
    if (period === "30D") return addDays(now, -30);
    if (period === "3M") return addDays(now, -90);
    if (period === "YTD") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return new Date("2000-01-01"); // ALL
  }, [period, now]);

  const activeUsers = users.filter(u => u.isActive && u.role !== "head");

  const startIso = useMemo(() => iso(startDate), [startDate]);
  const endIso = useMemo(() => iso(now), [now]);

  const periodActivities = useMemo(() => {
    if (period === "ALL") return db.activities;
    return db.activities.filter(a => {
      if (a.createdAt >= startIso) return true;
      if (a.startDate >= startIso && a.startDate <= endIso) return true;
      const hasLog = db.dailyLogs.some(l => l.activityId === a.id && l.date >= startIso && l.date <= endIso);
      if (hasLog) return true;
      if (a.status === "pending" && a.endDate >= startIso && a.endDate <= endIso) return true;
      return false;
    });
  }, [db.activities, db.dailyLogs, period, startIso, endIso]);

  const relevantLogs = useMemo(() => {
    return db.dailyLogs.filter(l => 
      periodActivities.some(a => a.id === l.activityId) && 
      (period === "ALL" || (l.date >= startIso && l.date <= endIso))
    );
  }, [db.dailyLogs, periodActivities, period, startIso, endIso]);

  const { total, completed, pending, missed, attendance, released, spent } = useMemo(() => {
    return {
      total: periodActivities.length,
      completed: periodActivities.filter(a => a.status === "completed").length,
      pending: periodActivities.filter(a => a.status === "pending").length,
      missed: periodActivities.filter(a => a.status === "missed").length,
      attendance: relevantLogs.reduce((acc, l) => acc + (l.attendees?.length || parseInt(l.attendanceCount) || 0), 0),
      released: relevantLogs.reduce((acc, l) => acc + (Number(l.amountReleasedNgn) || 0), 0),
      spent: relevantLogs.reduce((acc, l) => acc + (Number(l.amountSpentNgn) || 0), 0),
    };
  }, [periodActivities, relevantLogs]);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Member Performance
  const memberStats = useMemo(() => {
    return activeUsers.map(u => {
      const uActs = periodActivities.filter(a => a.createdBy === u.id);
      const uCompleted = uActs.filter(a => a.status === "completed").length;
      const uLogs = relevantLogs.filter(l => uActs.some(a => a.id === l.activityId));
      const uAttendance = uLogs.reduce((acc, l) => acc + (l.attendees?.length || parseInt(l.attendanceCount) || 0), 0);
      return {
        user: u,
        total: uActs.length,
        completed: uCompleted,
        rate: uActs.length > 0 ? Math.round((uCompleted / uActs.length) * 100) : 0,
        attendance: uAttendance,
      };
    }).sort((a, b) => b.total - a.total);
  }, [activeUsers, periodActivities, relevantLogs]);

  // Insights
  const insights: string[] = [];
  if (completionRate < 50 && total > 0) insights.push("Completion rate is below 50%. Unit needs to focus on finalizing pending activities.");
  if (missed > 0) insights.push(`${missed} activities missed in this period.`);
  if (spent > released) insights.push("Total reported spending exceeds released budget amounts.");
  const highLoadMember = memberStats[0];
  if (highLoadMember && highLoadMember.total > 0 && total > 0) {
    const pct = Math.round((highLoadMember.total / total) * 100);
    if (pct > 40) insights.push(`${firstName(highLoadMember.user.name)} is assigned ${pct}% of unit activities.`);
  }
  if (insights.length === 0) insights.push("Unit performance is stable with no immediate deterministic alerts.");

  // Attention Required
  const overdueActs = periodActivities.filter(a => a.status === "pending" && a.endDate < endIso);
  const missedActs = periodActivities.filter(a => a.status === "missed");
  const attentionItems = [
    ...overdueActs.map(a => ({ id: a.id, title: a.title, desc: "Overdue", type: "overdue" as const, by: a.createdBy })),
    ...missedActs.map(a => ({ id: a.id, title: a.title, desc: "Missed", type: "missed" as const, by: a.createdBy }))
  ];

  const generateReport = () => {
    const html = buildUnitReportHTML(`Period: ${period}`, periodActivities, relevantLogs, db, userMap, responsibilities, now, memberStats, insights, attentionItems);
    downloadReportDoc(html, `Unit_Report_${period}_${iso(now)}.doc`);
    showToast("Unit Report generated", "The formal report has been downloaded.");
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="page-head mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold leading-tight tracking-tight text-foreground">Unit Intelligence</h1>
          <p className="mt-1 text-sm text-foreground-secondary opacity-80 md:opacity-100 md:text-[15px]">Comprehensive overview of unit operations, performance, and financials.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex rounded-lg bg-surface-muted p-1 border border-border">
            {(["30D", "3M", "YTD", "ALL"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${period === p ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-foreground-secondary hover:text-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={generateReport} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={PATHS.download} /></svg>
            Export
          </button>
        </div>
      </div>

      {/* 1. Overview & 6. Financial Summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <MetricCard label="Total Activities" value={total} />
        <MetricCard label="Completed" value={completed} color="success" />
        <MetricCard label="Pending" value={pending} color="warning" />
        <MetricCard label="Completion Rate" value={`${completionRate}%`} color={completionRate >= 70 ? "success" : "warning"} />
        <MetricCard label="Released (₦)" value={released.toLocaleString()} />
        <MetricCard label="Spent (₦)" value={spent.toLocaleString()} />
        <MetricCard label="Attendance" value={attendance} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 9. Unit Insights */}
        <div className="lg:col-span-2">
          <Card title="Unit Insights" sub="Deterministic observations">
            <ul className="space-y-3">
              {insights.map((ins, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground-secondary bg-surface-muted p-3 rounded-lg border border-border">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary mt-0.5 shrink-0"><path d={PATHS.alert} /></svg>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* 8. Attention Required */}
        <div>
          <Card title="Attention Required" sub="Requires Head action">
            {attentionItems.length === 0 ? (
              <div className="text-sm text-foreground-faint py-4 text-center">No urgent items.</div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {attentionItems.slice(0, 10).map(item => (
                  <div key={item.id} onClick={() => router.push(`/activity/${item.id}`)} className="cursor-pointer flex items-center justify-between p-3 rounded-xl border border-critical/20 bg-critical-surface/30 hover:bg-critical-surface/50 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-semibold text-foreground truncate">{item.title}</div>
                      <div className="text-xs text-foreground-secondary mt-0.5">{userMap[item.by]?.name}</div>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-critical-surface text-critical border border-critical/20">{item.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 3 & 4. Member Performance & Workload */}
        <Card title="Member Performance" sub="Activity assignment & completion">
          <div className="space-y-4">
            {memberStats.map(m => (
              <div key={m.user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold font-display" style={{ background: m.user.color }}>
                  {m.user.photoUrl ? <img src={m.user.photoUrl} alt="" className="w-full h-full object-cover" /> : initials(m.user.name)}
                </div>
                <div className="min-w-0 w-32 shrink-0">
                  <div className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => router.push(`/member/${m.user.id}`)}>{firstName(m.user.name)}</div>
                  <div className="text-[10px] text-foreground-faint">{m.total} assigned</div>
                </div>
                <div className="flex-1 h-2.5 rounded-sm bg-surface-muted overflow-hidden flex">
                  <div className="h-full bg-success" style={{ width: `${m.rate}%` }} />
                </div>
                <div className="w-12 text-right text-xs font-mono font-bold">{m.rate}%</div>
                <div className="w-16 text-right text-[10px] text-foreground-secondary" title="Total attendance logged by member">{m.attendance} att.</div>
              </div>
            ))}
          </div>
        </Card>

        {/* 5. Responsibility Performance & 2. Activity Trends (Type) */}
        <div className="space-y-6 flex flex-col">
          <Card title="By Responsibility" sub="Workload distribution">
            <RespBars userId={null} activities={periodActivities} />
          </Card>
          <Card title="By Activity Type">
            <TypeBars userId={null} activities={periodActivities} />
          </Card>
        </div>
      </div>

    </div>
  );
}

function MetricCard({ label, value, color = "neutral" }: { label: string; value: string | number; color?: "neutral" | "success" | "warning" | "critical" }) {
  const bg = color === "neutral" ? "bg-surface-muted" : color === "success" ? "bg-success-surface/40" : color === "warning" ? "bg-warning-surface/40" : "bg-critical-surface/40";
  const border = color === "neutral" ? "border-border" : color === "success" ? "border-success/30" : color === "warning" ? "border-warning/30" : "border-critical/30";
  const text = color === "neutral" ? "text-foreground" : color === "success" ? "text-good" : color === "warning" ? "text-warning-foreground" : "text-critical";
  return (
    <div className={`p-4 rounded-2xl border ${bg} ${border}`}>
      <div className={`text-2xl font-extrabold tabular-nums mb-1 ${text}`}>{value}</div>
      <div className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">{label}</div>
    </div>
  );
}
