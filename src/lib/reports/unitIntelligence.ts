import type { Activity, DailyLog, User } from "@/lib/types";

export type UnitHealthStatus =
  | "excellent"
  | "on_track"
  | "watch"
  | "needs_attention"
  | "critical";

export type Severity = "critical" | "warning" | "positive" | "info";

export interface IntelligenceAlert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface MemberStat {
  userId: string;
  name: string;
  avatarColor: string;
  photoUrl?: string | null;
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
  missed: number;
  late: number;
  completionRate: number;
  attendance: number;
}

export interface UnitIntelligenceReport {
  status: UnitHealthStatus;
  narrative: string;
  whatWentWell: string[];
  challenges: string[];
  recommendedAttention: string[];
  alerts: IntelligenceAlert[];

  metrics: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    missed: number;
    lateCompletions: number;
    completionRate: number;
    
    // trends (diff vs prev period, e.g. +8 means improved by 8)
    totalTrend?: number;
    completedTrend?: number;
    completionRateTrend?: number;

    amountReleased: number;
    amountSpent: number;
    budgetVariance: number;
    
    attendanceTotal: number;
    attendanceTrend?: number;
  };
  
  memberStats: MemberStat[];
}

export interface IntelligenceEngineInput {
  currentActivities: Activity[];
  currentLogs: DailyLog[];
  prevActivities: Activity[] | null;
  prevLogs: DailyLog[] | null;
  users: User[];
  now: Date;
}

function isoToDate(iso: string) {
  return new Date(iso);
}

export function generateUnitIntelligence({
  currentActivities,
  currentLogs,
  prevActivities,
  prevLogs,
  users,
  now
}: IntelligenceEngineInput): UnitIntelligenceReport {
  const activeUsers = users.filter((u) => u.isActive && u.role !== "head");
  const userMap = new Map(users.map(u => [u.id, u]));

  // Basic Metrics
  const total = currentActivities.length;
  const completed = currentActivities.filter(a => a.status === "completed").length;
  const pending = currentActivities.filter(a => a.status === "pending").length;
  const missed = currentActivities.filter(a => a.status === "missed").length;
  const lateCompletions = currentActivities.filter(a => a.status === "completed" && a.submissionType === "late").length;
  
  const endIso = now.toISOString().split("T")[0]; // simplistic yyyy-mm-dd check
  const overdueActs = currentActivities.filter(a => a.status === "pending" && a.endDate < endIso);
  const overdue = overdueActs.length;
  
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  let attendanceTotal = 0;
  let cLogsWithAtt = 0;
  let amountReleased = 0;
  let amountSpent = 0;

  for (const log of currentLogs) {
    const att = (log.attendees?.length || parseInt(log.attendanceCount as string) || 0);
    if (att > 0) {
      attendanceTotal += att;
      cLogsWithAtt++;
    }
    amountReleased += Number(log.amountReleasedNgn) || 0;
    amountSpent += Number(log.amountSpentNgn) || 0;
  }
  const budgetVariance = amountReleased - amountSpent;

  // Previous Period Metrics
  let totalTrend: number | undefined;
  let completedTrend: number | undefined;
  let overdueTrend: number | undefined;
  let completionRateTrend: number | undefined;
  let attendanceTrend: number | undefined;

  if (prevActivities && prevLogs) {
    const pTotal = prevActivities.length;
    const pCompleted = prevActivities.filter(a => a.status === "completed").length;
    const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
    
    let pAttendance = 0;
    let pLogsWithAtt = 0;
    for (const log of prevLogs) {
      const att = (log.attendees?.length || parseInt(log.attendanceCount as string) || 0);
      if (att > 0) {
        pAttendance += att;
        pLogsWithAtt++;
      }
    }

    totalTrend = total - pTotal;
    completedTrend = completed - pCompleted;
    completionRateTrend = completionRate - pRate;
    
    if (pLogsWithAtt >= 2 && cLogsWithAtt >= 2) {
       const pAttRate = pAttendance / pLogsWithAtt;
       const cAttRate = attendanceTotal / cLogsWithAtt;
       attendanceTrend = Math.round(((cAttRate - pAttRate) / pAttRate) * 100);
    }
  }

  // Member Stats
  const memberStats: MemberStat[] = activeUsers.map(u => {
    const uActs = currentActivities.filter(a => a.createdBy === u.id);
    const uCompleted = uActs.filter(a => a.status === "completed").length;
    const uPending = uActs.filter(a => a.status === "pending").length;
    const uMissed = uActs.filter(a => a.status === "missed").length;
    const uLate = uActs.filter(a => a.status === "completed" && a.submissionType === "late").length;
    const uOverdue = uActs.filter(a => a.status === "pending" && a.endDate < endIso).length;
    
    const uLogs = currentLogs.filter(l => uActs.some(a => a.id === l.activityId));
    let uAtt = 0;
    for (const log of uLogs) {
       uAtt += (log.attendees?.length || parseInt(log.attendanceCount as string) || 0);
    }

    return {
      userId: u.id,
      name: u.name,
      avatarColor: u.color,
      photoUrl: u.photoUrl,
      totalAssigned: uActs.length,
      completed: uCompleted,
      pending: uPending,
      overdue: uOverdue,
      missed: uMissed,
      late: uLate,
      completionRate: uActs.length > 0 ? Math.round((uCompleted / uActs.length) * 100) : 0,
      attendance: uAtt,
    };
  }).sort((a, b) => b.totalAssigned - a.totalAssigned);

  // Intelligence Engine Rules
  
  const alerts: IntelligenceAlert[] = [];
  const whatWentWell: string[] = [];
  const challenges: string[] = [];
  const recommendedAttention: string[] = [];

  // Workload Imbalance
  const activePendingTotal = pending + overdue;
  let topLoadedMember: MemberStat | null = null;
  const activeMembers = memberStats.filter(m => m.totalAssigned > 0 || m.pending > 0);
  if (activeMembers.length > 1 && activePendingTotal >= 4) {
    const ms = [...memberStats].sort((a, b) => (b.pending + b.overdue) - (a.pending + a.overdue));
    const avgShare = 1 / activeMembers.length;
    const thresholdShare = Math.max(0.40, avgShare * 1.5); // At least 40%, and at least 1.5x their fair share
    if (ms[0] && (ms[0].pending + ms[0].overdue) / activePendingTotal >= thresholdShare && (ms[0].pending + ms[0].overdue) >= 4) {
      topLoadedMember = ms[0];
      alerts.push({
        id: "workload_imbalance",
        severity: "warning",
        title: "Workload imbalance",
        description: `One member (${topLoadedMember.name.split(" ")[0]}) currently owns ${Math.round(((topLoadedMember.pending + topLoadedMember.overdue) / activePendingTotal) * 100)}% of active assignments.`,
        actionLabel: "View workload",
        actionHref: `/member/${topLoadedMember.userId}`
      });
      challenges.push(`Workload is currently concentrated on ${topLoadedMember.name.split(" ")[0]}.`);
      recommendedAttention.push(`Rebalance pending assignments from ${topLoadedMember.name.split(" ")[0]}.`);
    }
  }

  // Deadlines & Overdue
  if (overdue > 0) {
    const oldestOverdue = overdueActs.reduce((oldest, act) => {
      if (!oldest) return act;
      return act.endDate < oldest.endDate ? act : oldest;
    }, null as Activity | null);
    
    let daysLate = 0;
    if (oldestOverdue) {
       daysLate = Math.floor((now.getTime() - isoToDate(oldestOverdue.endDate).getTime()) / (1000 * 60 * 60 * 24));
    }

    const isCritical = overdue >= 5 || daysLate > 14;
    alerts.push({
      id: "overdue_activities",
      severity: isCritical ? "critical" : "warning",
      title: `${overdue} ${overdue === 1 ? "activity" : "activities"} overdue`,
      description: oldestOverdue && daysLate > 0 ? `Oldest overdue item is ${daysLate} days late.` : "Some activities have passed their deadline.",
      actionLabel: "Review activities",
      actionHref: `/dashboard`
    });
    
    challenges.push(`${overdue} ${overdue === 1 ? "activity is" : "activities are"} overdue.`);
    recommendedAttention.push("Review the overdue activities with assignees.");
  } else if (total > 0) {
    whatWentWell.push("Zero overdue activities.");
  }

  // Completion Rate
  if (total > 0) {
    if (completionRate >= 80) {
      whatWentWell.push("Most planned activities were completed.");
    } else if (completionRate < 50 && total > 5) {
      alerts.push({
        id: "low_completion",
        severity: "warning",
        title: "Low completion rate",
        description: `Completion rate is at ${completionRate}%, which is below target.`,
        actionLabel: "Review activities",
        actionHref: `/dashboard`
      });
      challenges.push("Completion rate is below target.");
    }
  }

  // Trends
  if (completionRateTrend !== undefined && total > 0) {
    if (completionRateTrend >= 5) {
      whatWentWell.push(`Completion rate improved by ${completionRateTrend}%.`);
    } else if (completionRateTrend <= -10) {
      challenges.push(`Completion rate dropped by ${Math.abs(completionRateTrend)}% compared with the previous period.`);
    }
  }

  // Late submissions
  if (lateCompletions > 0) {
    alerts.push({
      id: "late_submissions",
      severity: "warning",
      title: `${lateCompletions} ${lateCompletions === 1 ? "activity" : "activities"} submitted late`,
      description: "Some completed activities were logged after their deadline via the exception workflow.",
    });
    challenges.push(`${lateCompletions} ${lateCompletions === 1 ? "activity was" : "activities were"} completed late.`);
    recommendedAttention.push("Monitor late submissions — members may need clearer deadlines or reminders.");
  }

  // Financial Health
  if (amountReleased > 0 || amountSpent > 0) {
    if (amountSpent > amountReleased) {
      alerts.push({
        id: "budget_exceeded",
        severity: "critical",
        title: "Budget exceeded",
        description: "Reported spending exceeds the released funds for this period.",
      });
      challenges.push("Spending exceeds released funds.");
      recommendedAttention.push("Review recent financial logs to address the budget deficit.");
    } else {
      whatWentWell.push("Spending remains within released funds.");
    }
  }

  // Attendance
  if (attendanceTrend !== undefined) {
    if (attendanceTrend <= -10) {
      alerts.push({
        id: "attendance_decline",
        severity: "warning",
        title: "Attendance declining",
        description: `Participation per activity fell ${Math.abs(attendanceTrend)}% compared with the previous period.`,
      });
      challenges.push("Attendance per activity has declined compared with the previous period.");
      recommendedAttention.push("Investigate the declining attendance.");
    } else if (attendanceTrend >= 10) {
      whatWentWell.push("Participation has improved compared with the previous period.");
    }
  }

  // Member Performance Warnings
  if (total > 0 && memberStats.length > 0) {
    const topPerformer = [...memberStats].sort((a, b) => b.completed - a.completed)[0];
    if (topPerformer && topPerformer.completed >= 3 && topPerformer.completionRate >= 80) {
      whatWentWell.push(`${topPerformer.name.split(" ")[0]} demonstrated strong completion performance.`);
    }
  }

  // Overall Health Status Scoring
  let score = 100;
  if (completionRate < 50) score -= 25;
  if (completionRate >= 80) score += 10;
  if (overdue > 0) score -= (overdue * 5); // penalize 5 per overdue
  if (missed > 0) score -= (missed * 10);
  if (amountSpent > amountReleased) score -= 30;
  if (completionRateTrend && completionRateTrend < -10) score -= 15;
  if (attendanceTrend && attendanceTrend < -10) score -= 10;
  if (topLoadedMember) score -= 15;

  let status: UnitHealthStatus = "on_track";
  if (total === 0) {
    status = "on_track";
  } else if (score >= 95) {
    status = "excellent";
  } else if (score >= 70) {
    status = "on_track";
  } else if (score >= 50) {
    status = "watch";
  } else if (score >= 30) {
    status = "needs_attention";
  } else {
    status = "critical";
  }

  // Hard caps based on active alerts
  const hasCritical = alerts.some(a => a.severity === "critical");
  const hasWarning = alerts.some(a => a.severity === "warning");
  
  if (hasCritical && (status === "excellent" || status === "on_track" || status === "watch")) {
    status = "needs_attention";
  } else if (hasWarning && (status === "excellent" || status === "on_track")) {
    status = "watch";
  }

  // Sort alerts by severity
  const severityWeight = { critical: 4, warning: 3, info: 2, positive: 1 };
  alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  // Generate Narrative
  let narrative = "";
  if (total === 0) {
    narrative = "There is no activity logged for this period.";
  } else {
    let trendTxt = "";
    if (completionRateTrend !== undefined) {
      if (completionRateTrend > 0) {
        trendTxt = `, improving ${completionRateTrend}% compared with the previous period`;
      } else if (completionRateTrend < 0) {
        trendTxt = `, down ${Math.abs(completionRateTrend)}% from the previous period`;
      }
    }
    narrative = `Your unit completed **${completed} of ${total} activities (${completionRate}%)** during this period${trendTxt}. `;

    if (overdue > 0 || topLoadedMember) {
      const parts = [];
      if (overdue > 0) parts.push(`**${overdue} ${overdue === 1 ? 'activity is' : 'activities are'} overdue**`);
      if (topLoadedMember) parts.push(`workload is currently concentrated on a single member`);
      narrative += `Overall activity is steady, although ${parts.join(" and ")}.`;
    } else {
      if (completionRate >= 70) {
        narrative += `Overall activity is healthy and workloads appear balanced.`;
      } else {
        narrative += `Overall completion is low, but no activities are currently overdue.`;
      }
    }
    if (lateCompletions > 0) {
      narrative += ` ${lateCompletions} ${lateCompletions === 1 ? "activity" : "activities"} ${lateCompletions === 1 ? "was" : "were"} submitted after their deadline.`;
    }
  }
  
  if (whatWentWell.length === 0) whatWentWell.push("No specific highlights for this period.");
  
  return {
    status,
    narrative,
    whatWentWell: Array.from(new Set(whatWentWell)).slice(0, 4),
    challenges: Array.from(new Set(challenges)).slice(0, 4),
    recommendedAttention: Array.from(new Set(recommendedAttention)).slice(0, 4),
    alerts,
    metrics: {
      total,
      completed,
      pending,
      overdue,
      missed,
      lateCompletions,
      completionRate,
      totalTrend,
      completedTrend,
      completionRateTrend,
      amountReleased,
      amountSpent,
      budgetVariance,
      attendanceTotal,
      attendanceTrend
    },
    memberStats
  };
}
