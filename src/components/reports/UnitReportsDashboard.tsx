"use client";

import { useState, useMemo } from "react";
import { useTrak } from "@/context/TrakStore";
import { addDays, iso } from "@/lib/dates";
import { PATHS } from "@/components/icons";
import { Card, TypeBars, RespBars, WeeklyChart } from "@/components/dashboard/MemberDashboard";
import { buildUnitReportHTML, downloadReportDoc } from "@/lib/reports/buildReport";
import { firstName, initials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { generateUnitIntelligence, UnitHealthStatus } from "@/lib/reports/unitIntelligence";

export function UnitReportsDashboard() {
  const router = useRouter();
  const { db, users, userMap, responsibilities, now, showToast } = useTrak();
  const [period, setPeriod] = useState<"30D" | "3M" | "YTD" | "ALL">("30D");

  const { startIso, endIso, pStartIso, pEndIso } = useMemo(() => {
    let s: Date;
    let pS: Date | null = null;
    let pE: Date | null = null;

    if (period === "30D") {
      s = addDays(now, -30);
      pS = addDays(now, -60);
      pE = addDays(now, -30);
    } else if (period === "3M") {
      s = addDays(now, -90);
      pS = addDays(now, -180);
      pE = addDays(now, -90);
    } else if (period === "YTD") {
      s = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      pS = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      pE = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
    } else {
      s = new Date("2000-01-01"); // ALL
    }
    return {
      startIso: iso(s),
      endIso: iso(now),
      pStartIso: pS ? iso(pS) : null,
      pEndIso: pE ? iso(pE) : null,
    };
  }, [period, now]);

  const activeUsers = users.filter(u => u.isActive && u.role !== "head");

  const filterActs = (sIso: string, eIso: string) => {
    return db.activities.filter(a => {
      if (a.createdAt >= sIso && a.createdAt <= eIso) return true;
      if (a.startDate >= sIso && a.startDate <= eIso) return true;
      const hasLog = db.dailyLogs.some(l => l.activityId === a.id && l.date >= sIso && l.date <= eIso);
      if (hasLog) return true;
      if (a.status === "pending" && a.endDate >= sIso && a.endDate <= eIso) return true;
      return false;
    });
  };

  const filterLogs = (acts: typeof db.activities, sIso: string, eIso: string) => {
    return db.dailyLogs.filter(l => 
      acts.some(a => a.id === l.activityId) && 
      (l.date >= sIso && l.date <= eIso)
    );
  };

  const currentActivities = useMemo(() => filterActs(startIso, endIso), [startIso, endIso, db.activities, db.dailyLogs]);
  const currentLogs = useMemo(() => filterLogs(currentActivities, startIso, endIso), [currentActivities, startIso, endIso, db.dailyLogs]);

  const prevActivities = useMemo(() => pStartIso && pEndIso ? filterActs(pStartIso, pEndIso) : null, [pStartIso, pEndIso, db.activities, db.dailyLogs]);
  const prevLogs = useMemo(() => pStartIso && pEndIso && prevActivities ? filterLogs(prevActivities, pStartIso, pEndIso) : null, [pStartIso, pEndIso, prevActivities, db.dailyLogs]);

  const intelligence = useMemo(() => {
    return generateUnitIntelligence({
      currentActivities,
      currentLogs,
      prevActivities,
      prevLogs,
      users,
      now
    });
  }, [currentActivities, currentLogs, prevActivities, prevLogs, users, now]);

  const generateReport = () => {
    const html = buildUnitReportHTML(
      `Period: ${period}`, 
      currentActivities, 
      currentLogs, 
      db, 
      userMap, 
      responsibilities, 
      now, 
      intelligence.memberStats.map(m => ({
         user: userMap[m.userId],
         total: m.totalAssigned,
         completed: m.completed,
         rate: m.completionRate,
         attendance: m.attendance
      })), 
      intelligence.challenges, // Use challenges for report insights temporarily
      intelligence.alerts.map(a => ({ id: a.id, title: a.title, desc: a.description, type: a.severity === "critical" ? "missed" : "overdue", by: "" })) // map alerts back to attentionItems shape for report builder
    );
    downloadReportDoc(html, `Unit_Report_${period}_${iso(now)}.doc`);
    showToast("Unit Report generated", "The formal report has been downloaded.");
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="page-head mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold leading-tight tracking-tight text-foreground">Unit Intelligence</h1>
          <p className="mt-1 text-sm text-foreground-secondary opacity-80 md:opacity-100 md:text-[15px]">Executive briefing and performance analysis.</p>
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

      {/* EXECUTIVE BRIEFING */}
      <div className="mb-6 rounded-3xl bg-surface p-8 shadow-sm border border-border">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
             <StatusBadge status={intelligence.status} />
          </div>
          <p className="text-[16px] leading-relaxed text-foreground max-w-3xl">
             {/* Simple markdown bolding support for narrative */}
             {intelligence.narrative.split("**").map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-foreground-secondary uppercase mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success"><path d={PATHS.check} /></svg>
              What Went Well
            </h3>
            <ul className="space-y-3">
              {intelligence.whatWentWell.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2.5">
                  <span className="text-success mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-foreground-secondary uppercase mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning-foreground"><path d={PATHS.alert} /></svg>
              Needs Attention
            </h3>
            {intelligence.challenges.length === 0 ? (
               <div className="text-sm text-foreground-faint">No major challenges detected.</div>
            ) : (
              <ul className="space-y-3 mb-5">
                {intelligence.challenges.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2.5">
                    <span className="text-warning-foreground mt-0.5 shrink-0">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {intelligence.recommendedAttention.length > 0 && (
               <div className="bg-surface-muted rounded-xl p-4 border border-border">
                  <div className="text-[11px] font-bold text-foreground-secondary uppercase mb-2">Recommended Attention</div>
                  <ul className="space-y-2">
                     {intelligence.recommendedAttention.map((rec, i) => (
                        <li key={i} className="text-sm text-foreground font-medium flex gap-2">
                           <span className="text-primary">→</span> {rec}
                        </li>
                     ))}
                  </ul>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Completed" value={intelligence.metrics.completed} trend={intelligence.metrics.completedTrend} color="success" />
        <MetricCard label="Pending" value={intelligence.metrics.pending} />
        <MetricCard label="Overdue & Missed" value={intelligence.metrics.overdue + intelligence.metrics.missed} color={intelligence.metrics.overdue + intelligence.metrics.missed > 0 ? "critical" : "neutral"} />
        {intelligence.metrics.amountReleased > 0 ? (
          <MetricCard 
             label="Budget Delta" 
             value={(intelligence.metrics.amountReleased - intelligence.metrics.amountSpent).toLocaleString()} 
             prefix="₦" 
             color={intelligence.metrics.budgetVariance < 0 ? "critical" : "neutral"} 
          />
        ) : (
          <MetricCard label="Attendance" value={intelligence.metrics.attendanceTotal} trend={intelligence.metrics.attendanceTrend} isPercentTrend />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Trend */}
        <div className="flex flex-col gap-6">
           <Card title="Performance Trend" sub="Unit activity timeline">
              <WeeklyChart userId={null} />
           </Card>
           
           <Card title="Intelligence & Alerts" sub="Prioritized findings">
              {intelligence.alerts.length === 0 ? (
                 <div className="text-sm text-foreground-faint py-4 text-center">No active alerts.</div>
              ) : (
                 <div className="space-y-3">
                    {intelligence.alerts.map(a => (
                       <AlertCard key={a.id} alert={a} router={router} />
                    ))}
                 </div>
              )}
           </Card>
        </div>

        {/* Member Performance */}
        <div className="flex flex-col gap-6">
          <Card title="Member Performance" sub="Ranked by workload and completion">
            <div className="space-y-4">
              {intelligence.memberStats.length === 0 ? (
                 <div className="text-sm text-foreground-faint py-4 text-center">No member data.</div>
              ) : (
                 intelligence.memberStats.map(m => (
                  <div key={m.userId} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold font-display" style={{ background: m.avatarColor }}>
                      {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : initials(m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={() => router.push(`/member/${m.userId}`)}>{m.name}</div>
                      <div className="text-[11px] text-foreground-secondary mt-0.5 flex gap-2">
                         <span>{m.completed} completed</span>
                         <span className="opacity-50">·</span>
                         <span className={m.overdue > 0 ? "text-critical font-medium" : ""}>{m.pending + m.overdue} pending/overdue</span>
                      </div>
                    </div>
                    
                    <div className="w-24 shrink-0 flex flex-col items-end gap-1.5">
                       <div className="text-xs font-mono font-bold text-foreground">{m.completionRate}%</div>
                       <div className="w-full h-1.5 rounded-sm bg-surface-muted overflow-hidden flex">
                         <div className="h-full bg-success" style={{ width: `${m.completionRate}%` }} />
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title="Responsibilities" sub="Distribution of unit activities">
            <RespBars userId={null} activities={currentActivities} />
          </Card>
          <Card title="Activity Types">
            <TypeBars userId={null} activities={currentActivities} />
          </Card>
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: UnitHealthStatus }) {
  const map: Record<UnitHealthStatus, { label: string, color: string, dot: string }> = {
    excellent: { label: "EXCELLENT", color: "bg-success-surface text-good border-success/30", dot: "bg-success" },
    on_track: { label: "ON TRACK", color: "bg-success-surface/40 text-good border-success/20", dot: "bg-success" },
    watch: { label: "WATCH", color: "bg-warning-surface/50 text-warning-foreground border-warning/30", dot: "bg-warning-semantic" },
    needs_attention: { label: "NEEDS ATTENTION", color: "bg-warning-surface text-warning-ink border-warning/40", dot: "bg-warning-semantic" },
    critical: { label: "CRITICAL", color: "bg-critical-surface text-critical border-critical/30", dot: "bg-critical" },
  };
  const { label, color, dot } = map[status] || map.on_track;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold tracking-widest ${color}`}>
       <div className={`w-2 h-2 rounded-full ${dot}`} />
       {label}
    </div>
  );
}

function AlertCard({ alert, router }: { alert: any; router: any }) {
   const isCrit = alert.severity === "critical";
   const isWarn = alert.severity === "warning";
   const bg = isCrit ? "bg-critical-surface/30 border-critical/20" : isWarn ? "bg-warning-surface/30 border-warning/20" : "bg-surface-muted border-border";
   const iconColor = isCrit ? "text-critical" : isWarn ? "text-warning-ink" : "text-foreground-secondary";
   
   return (
      <div className={`p-4 rounded-2xl border ${bg}`}>
         <div className="flex gap-3">
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
               {isCrit ? "🔴" : isWarn ? "🟠" : "🟡"}
            </div>
            <div>
               <div className="text-[13.5px] font-semibold text-foreground mb-1">{alert.title}</div>
               <div className="text-[12.5px] text-foreground-secondary mb-3 leading-snug">{alert.description}</div>
               {alert.actionLabel && alert.actionHref && (
                  <button 
                     onClick={() => router.push(alert.actionHref)}
                     className="text-[11.5px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                  >
                     {alert.actionLabel} →
                  </button>
               )}
            </div>
         </div>
      </div>
   );
}

function MetricCard({ 
   label, 
   value, 
   color = "neutral",
   trend,
   trendInverted = false,
   prefix = "",
   isPercentTrend = false
}: { 
   label: string; 
   value: string | number; 
   color?: "neutral" | "success" | "warning" | "critical";
   trend?: number;
   trendInverted?: boolean;
   prefix?: string;
   isPercentTrend?: boolean;
}) {
  const bg = color === "neutral" ? "bg-surface" : color === "success" ? "bg-success-surface/20" : color === "warning" ? "bg-warning-surface/20" : "bg-critical-surface/20";
  const border = color === "neutral" ? "border-border" : color === "success" ? "border-success/30" : color === "warning" ? "border-warning/30" : "border-critical/30";
  const text = color === "neutral" ? "text-foreground" : color === "success" ? "text-good" : color === "warning" ? "text-warning-foreground" : "text-critical";
  
  return (
    <div className={`relative p-5 rounded-3xl border shadow-sm ${bg} ${border}`}>
      <div className="text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-end justify-between">
         <div className={`text-[32px] font-display font-semibold tabular-nums leading-none ${text}`}>
            {prefix}{value}
         </div>
         {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold pb-1 ${
               (trend > 0 && !trendInverted) || (trend < 0 && trendInverted) ? "text-success" : "text-critical"
            }`}>
               {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}{isPercentTrend ? "%" : ""}
            </div>
         )}
      </div>
    </div>
  );
}
