import { describe, expect, test } from "vitest";
import {
  countPendingActivities,
  countUnreadInnovation,
  countUnreadLibrary,
  countUnreadMessages,
} from "@/lib/unreadMessages";
import type { Activity, Notification } from "@/lib/types";

function makeNotif(overrides: Partial<Notification>): Notification {
  return {
    id: "1",
    userId: "u1",
    type: "dm",
    text: "Hi",
    activityId: null,
    messageId: "m1",
    createdAt: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    title: "Task",
    type: "Task",
    description: "",
    createdBy: "u1",
    delegatedBy: null,
    assigneeId: null,
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    responsibilityIds: [],
    location: "",
    status: "pending",
    exceptionStatus: "none",
    exceptionReason: "",
    submissionType: "normal",
    gracePeriodStartedAt: null,
    gracePeriodExpiresAt: null,
    dueAt: null,
    reminderStatus: {},
    reminderVersion: 0,
    createdAt: new Date().toISOString(),
    initiativeTeamwork: "",
    challenges: "",
    outcomes: "",
    nextSteps: "",
    hasBudget: false,
    estimatedAmountNgn: null,
    hidden: false,
    softDeletedAt: null,
    collaborative: false,
    ...overrides,
  } as unknown as Activity;
}

describe("countUnreadMessages", () => {
  test("counts unread dm, community, mention and announcement notifications", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "dm", read: false }),
      makeNotif({ id: "2", type: "community", read: false }),
      makeNotif({ id: "3", type: "mention", read: false }),
      makeNotif({ id: "4", type: "announcement", read: false }),
    ];
    expect(countUnreadMessages(notifs)).toBe(4);
  });

  test("ignores read notifications", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "dm", read: true }),
      makeNotif({ id: "2", type: "dm", read: false }),
    ];
    expect(countUnreadMessages(notifs)).toBe(1);
  });

  test("ignores non-message notification types, including broadcast", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "comment", read: false }),
      makeNotif({ id: "2", type: "activity_reminder", read: false }),
      makeNotif({ id: "3", type: "library_new", read: false }),
      makeNotif({ id: "4", type: "broadcast", read: false }),
    ];
    expect(countUnreadMessages(notifs)).toBe(0);
  });

  test("returns 0 for an empty list", () => {
    expect(countUnreadMessages([])).toBe(0);
  });
});

describe("countPendingActivities", () => {
  test("counts only pending, non-deleted activities", () => {
    const activities: Activity[] = [
      makeActivity({ id: "1", createdBy: "u1", status: "pending" }),
      makeActivity({ id: "2", createdBy: "u1", status: "completed" }),
      makeActivity({ id: "3", createdBy: "u1", status: "pending", softDeletedAt: new Date().toISOString() }),
    ];
    expect(countPendingActivities(activities, "u1", false)).toBe(1);
  });

  test("head sees every pending activity (even ones they did not create)", () => {
    const activities: Activity[] = [
      makeActivity({ id: "1", createdBy: "u2", status: "pending" }),
      makeActivity({ id: "2", createdBy: "u3", status: "pending" }),
    ];
    expect(countPendingActivities(activities, "head", true)).toBe(2);
  });

  test("members see activities they created or are assigned to", () => {
    const activities: Activity[] = [
      makeActivity({ id: "1", createdBy: "u2", status: "pending" }),
      makeActivity({ id: "2", createdBy: "u2", assigneeId: "u1", status: "pending" }),
      makeActivity({ id: "3", createdBy: "u3", status: "pending" }),
    ];
    expect(countPendingActivities(activities, "u1", false)).toBe(1);
  });

  test("members see pending activities they accepted a collaboration on", () => {
    const activities: Activity[] = [
      makeActivity({
        id: "1",
        createdBy: "u2",
        status: "pending",
        collaborators: [
          { id: "c1", activityId: "1", userId: "u1", invitedById: "u2", status: "accepted", respondedAt: null, createdAt: "" },
        ],
      }),
      makeActivity({
        id: "2",
        createdBy: "u2",
        status: "pending",
        collaborators: [
          { id: "c2", activityId: "2", userId: "u1", invitedById: "u2", status: "pending", respondedAt: null, createdAt: "" },
        ],
      }),
    ];
    expect(countPendingActivities(activities, "u1", false)).toBe(1);
  });

  test("members never see hidden activities", () => {
    const activities: Activity[] = [
      makeActivity({ id: "1", createdBy: "u1", status: "pending", hidden: true }),
    ];
    expect(countPendingActivities(activities, "u1", false)).toBe(0);
  });
});

describe("countUnreadLibrary", () => {
  test("head watches the review queue (library_submitted)", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "library_submitted", read: false }),
      makeNotif({ id: "2", type: "library_submitted", read: true }),
      makeNotif({ id: "3", type: "library_new", read: false }),
    ];
    expect(countUnreadLibrary(notifs, true)).toBe(1);
  });

  test("members watch newly published resources (library_new)", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "library_new", read: false }),
      makeNotif({ id: "2", type: "library_new", read: true }),
      makeNotif({ id: "3", type: "library_submitted", read: false }),
      makeNotif({ id: "4", type: "library_approved", read: false }),
    ];
    expect(countUnreadLibrary(notifs, false)).toBe(1);
  });
});

describe("countUnreadInnovation", () => {
  test("head watches the review queue (innovation_submitted)", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "innovation_submitted", read: false }),
      makeNotif({ id: "2", type: "innovation_new", read: false }),
    ];
    expect(countUnreadInnovation(notifs, true)).toBe(1);
  });

  test("members watch newly approved ideas (innovation_new)", () => {
    const notifs: Notification[] = [
      makeNotif({ id: "1", type: "innovation_new", read: false }),
      makeNotif({ id: "2", type: "innovation_new", read: true }),
      makeNotif({ id: "3", type: "innovation_submitted", read: false }),
      makeNotif({ id: "4", type: "innovation_approved", read: false }),
    ];
    expect(countUnreadInnovation(notifs, false)).toBe(1);
  });
});
