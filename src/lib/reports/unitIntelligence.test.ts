import { describe, it, expect } from "vitest";
import { generateUnitIntelligence, UnitHealthStatus } from "./unitIntelligence";
import type { Activity, DailyLog, User } from "@/lib/types";

describe("unitIntelligence Engine", () => {
  const now = new Date("2026-08-31T10:00:00Z");
  
  const createMockUsers = (): User[] => [
    { id: "u1", name: "Alice", isActive: true, role: "member" } as User,
    { id: "u2", name: "Bob", isActive: true, role: "member" } as User,
    { id: "h1", name: "Head", isActive: true, role: "head" } as User,
  ];

  it("New/empty unit", () => {
    const result = generateUnitIntelligence({
      currentActivities: [],
      currentLogs: [],
      prevActivities: null,
      prevLogs: null,
      users: createMockUsers(),
      now
    });

    expect(result.metrics.total).toBe(0);
    expect(result.status).toBe("on_track");
    expect(result.narrative).toBe("There is no activity logged for this period.");
  });

  it("Healthy unit", () => {
    // high completion, no overdue, good attendance, balanced workload
    const users = createMockUsers();
    const acts: Partial<Activity>[] = [
      { id: "a1", createdBy: "u1", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
      { id: "a2", createdBy: "u1", status: "completed", startDate: "2026-08-02", endDate: "2026-08-02" },
      { id: "a3", createdBy: "u2", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
      { id: "a4", createdBy: "u2", status: "completed", startDate: "2026-08-02", endDate: "2026-08-02" },
      { id: "a5", createdBy: "u1", status: "pending", startDate: "2026-09-01", endDate: "2026-09-01" }, // Future, not overdue
      { id: "a6", createdBy: "u2", status: "pending", startDate: "2026-09-01", endDate: "2026-09-01" }, // Future, not overdue
    ];

    const logs: Partial<DailyLog>[] = [
      { activityId: "a1", date: "2026-08-01", attendanceCount: "10" },
      { activityId: "a3", date: "2026-08-01", attendanceCount: "10" },
    ];

    const result = generateUnitIntelligence({
      currentActivities: acts as Activity[],
      currentLogs: logs as DailyLog[],
      prevActivities: null,
      prevLogs: null,
      users,
      now
    });

    expect(["excellent", "on_track"]).toContain(result.status);
    expect(result.metrics.completionRate).toBe(Math.round(4/6 * 100));
    expect(result.metrics.overdue).toBe(0);
    expect(result.alerts.length).toBe(0);
  });

  it("Struggling unit", () => {
    // low completion, multiple overdue, overloaded member
    const users = createMockUsers();
    const acts: Partial<Activity>[] = [
      { id: "a1", createdBy: "u1", status: "pending", startDate: "2026-08-01", endDate: "2026-08-01" }, // Overdue
      { id: "a2", createdBy: "u1", status: "pending", startDate: "2026-08-02", endDate: "2026-08-02" }, // Overdue
      { id: "a3", createdBy: "u1", status: "pending", startDate: "2026-08-03", endDate: "2026-08-03" }, // Overdue
      { id: "a4", createdBy: "u1", status: "pending", startDate: "2026-08-04", endDate: "2026-08-04" }, // Overdue
      { id: "a5", createdBy: "u2", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
    ];

    const result = generateUnitIntelligence({
      currentActivities: acts as Activity[],
      currentLogs: [],
      prevActivities: null,
      prevLogs: null,
      users,
      now
    });

    expect(["needs_attention", "critical"]).toContain(result.status);
    expect(result.metrics.overdue).toBe(4);
    
    const hasWorkloadAlert = result.alerts.some(a => a.id === "workload_imbalance");
    expect(hasWorkloadAlert).toBe(true);

    const hasOverdueAlert = result.alerts.some(a => a.id === "overdue_activities");
    expect(hasOverdueAlert).toBe(true);
  });

  it("Improving unit", () => {
    // completion improved
    const users = createMockUsers();
    
    const prevActs: Partial<Activity>[] = [
      { id: "p1", createdBy: "u1", status: "completed", startDate: "2026-07-01", endDate: "2026-07-01" },
      { id: "p2", createdBy: "u1", status: "pending", startDate: "2026-07-02", endDate: "2026-07-02" },
      { id: "p3", createdBy: "u2", status: "pending", startDate: "2026-07-03", endDate: "2026-07-03" },
      { id: "p4", createdBy: "u2", status: "pending", startDate: "2026-07-04", endDate: "2026-07-04" },
    ]; // 25% complete
    const currActs: Partial<Activity>[] = [
      { id: "c1", createdBy: "u1", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
      { id: "c2", createdBy: "u1", status: "completed", startDate: "2026-08-02", endDate: "2026-08-02" },
      { id: "c3", createdBy: "u2", status: "completed", startDate: "2026-08-03", endDate: "2026-08-03" },
      { id: "c4", createdBy: "u2", status: "pending", startDate: "2026-09-01", endDate: "2026-09-01" },
    ]; // 75% complete

    const result = generateUnitIntelligence({
      currentActivities: currActs as Activity[],
      currentLogs: [],
      prevActivities: prevActs as Activity[],
      prevLogs: [],
      users,
      now
    });

    expect(result.metrics.completionRateTrend).toBeGreaterThan(0);
    expect(result.whatWentWell.some(w => w.includes("improved"))).toBe(true);
  });

  it("No historical comparison", () => {
    const result = generateUnitIntelligence({
      currentActivities: [
        { id: "a1", createdBy: "u1", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" } as Activity,
      ],
      currentLogs: [],
      prevActivities: null,
      prevLogs: null,
      users: createMockUsers(),
      now
    });

    expect(result.metrics.totalTrend).toBeUndefined();
    expect(result.narrative).not.toContain("improved");
    expect(result.narrative).not.toContain("down");
  });

  it("Financial health - budget exceeded", () => {
    const acts: Partial<Activity>[] = [
      { id: "a1", createdBy: "u1", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
    ];
    const logs: Partial<DailyLog>[] = [
      { activityId: "a1", date: "2026-08-01", amountReleasedNgn: 50000, amountSpentNgn: 70000 },
    ];

    const result = generateUnitIntelligence({
      currentActivities: acts as Activity[],
      currentLogs: logs as DailyLog[],
      prevActivities: null,
      prevLogs: null,
      users: createMockUsers(),
      now
    });

    expect(result.metrics.budgetVariance).toBe(-20000);
    expect(result.alerts.some(a => a.id === "budget_exceeded")).toBe(true);
  });

  it("No financial data", () => {
    const acts: Partial<Activity>[] = [
      { id: "a1", createdBy: "u1", status: "completed", startDate: "2026-08-01", endDate: "2026-08-01" },
    ];
    const logs: Partial<DailyLog>[] = [
      { activityId: "a1", date: "2026-08-01" },
    ];

    const result = generateUnitIntelligence({
      currentActivities: acts as Activity[],
      currentLogs: logs as DailyLog[],
      prevActivities: null,
      prevLogs: null,
      users: createMockUsers(),
      now
    });

    expect(result.metrics.amountReleased).toBe(0);
    expect(result.metrics.amountSpent).toBe(0);
    expect(result.alerts.some(a => a.id === "budget_exceeded")).toBe(false);
  });

  it("Flags late submissions", () => {
    const users = createMockUsers();
    const acts: Partial<Activity>[] = [
      { id: "a1", createdBy: "u1", status: "completed", submissionType: "late", startDate: "2026-08-01", endDate: "2026-08-01" },
      { id: "a2", createdBy: "u2", status: "completed", submissionType: "normal", startDate: "2026-08-02", endDate: "2026-08-02" },
      { id: "a3", createdBy: "u2", status: "completed", submissionType: "late", startDate: "2026-08-03", endDate: "2026-08-03" },
    ];

    const result = generateUnitIntelligence({
      currentActivities: acts as Activity[],
      currentLogs: [],
      prevActivities: null,
      prevLogs: null,
      users,
      now
    });

    expect(result.metrics.lateCompletions).toBe(2);
    const lateAlert = result.alerts.find(a => a.id === "late_submissions");
    expect(lateAlert).toBeTruthy();
    expect(result.narrative).toContain("submitted after their deadline");
    expect(result.memberStats.find(m => m.userId === "u2")?.late).toBe(1);
  });
});
