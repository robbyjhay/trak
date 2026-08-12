import { addDays, iso } from "@/lib/dates";
import { HEAD_USER_ID } from "@/lib/constants";
import { firstName } from "@/lib/utils";
import type { TrakDb, User } from "@/lib/types";
import {
  createActivity,
  createEmptyDb,
  pushNotification,
  resetUid,
  submitDailyLog,
  uid,
  updateActivityWrapup,
  recomputeStatus,
} from "./mutations";
import { SEED_USERS } from "./users";

const TITLE_POOL = [
  { title: "LMS Course Production — Onboarding Module", type: "Task" as const, resp: "r1" },
  { title: "SCORM Package QA — Finance Basics", type: "Task" as const, resp: "r1" },
  { title: "Course Content Review — HR Policy Series", type: "Meeting" as const, resp: "r1" },
  { title: "Virtual Cohort 4 — Facilitator Onboarding", type: "Meeting" as const, resp: "r2" },
  { title: "Virtual Learning Enrollment Drive", type: "Task" as const, resp: "r2" },
  { title: "Studio Equipment Maintenance Check", type: "Task" as const, resp: "r3" },
  { title: "Studio Booking Calendar Update", type: "Task" as const, resp: "r3" },
  { title: "PSSDC Workflow Mapping — Leave Requests", type: "Project" as const, resp: "r4" },
  { title: "Process Automation Scoping — Procurement", type: "Meeting" as const, resp: "r4" },
  { title: "Website Homepage Content Refresh", type: "Task" as const, resp: "r5" },
  { title: "Website Security Patch Deployment", type: "Task" as const, resp: "r5" },
  { title: "UX Review — Course Catalogue Page", type: "Meeting" as const, resp: "r5" },
  { title: "Training Needs Assessment — Finance Dept", type: "Meeting" as const, resp: "r6" },
  { title: "Curriculum Design — New Hire Orientation", type: "Task" as const, resp: "r6" },
  { title: "Lagos State MDA Training Cohort — Kickoff", type: "Program" as const, resp: "r7" },
  { title: "State-Wide Training Stakeholder Engagement", type: "Meeting" as const, resp: "r7" },
  { title: "Internal App — Leave Tracker Requirements", type: "Meeting" as const, resp: "r8" },
  { title: "Internal App — Leave Tracker Build Review", type: "Task" as const, resp: "r8" },
  { title: "Consultancy Scoping — MDA Client", type: "Project" as const, resp: "r9" },
  { title: "Video Lecture Production — Ethics Series", type: "Task" as const, resp: "r10" },
  { title: "PSSDC Monthly Management Briefing", type: "Meeting" as const, resp: "r4" },
  { title: "Digital Learning Unit — Monthly All-Hands", type: "Meeting" as const, resp: "r4" },
];

function rand(max: number) {
  return Math.floor(Math.random() * max);
}

export function seedDb(now: Date): { db: TrakDb; users: User[] } {
  resetUid(1000);
  const db = createEmptyDb();
  const users = SEED_USERS.map((u) => ({ ...u }));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const memberIds = users.map((u) => u.id);

  for (let i = 0; i < 70; i++) {
    const person = memberIds[rand(memberIds.length)];
    const pick = TITLE_POOL[rand(TITLE_POOL.length)];
    const daysAgo = rand(63) + 1;
    const date = iso(addDays(now, -daysAgo));
    const act = createActivity(
      db,
      {
        title: pick.title,
        type: pick.type,
        description: "",
        createdBy: person,
        startDate: date,
        endDate: date,
        startTime: "09:00",
        endTime: "11:00",
        responsibilityIds: [pick.resp],
        seedDate: date,
      },
      now,
    );
    if (!(daysAgo <= 1 && Math.random() < 0.5)) {
      submitDailyLog(
        db,
        act.id,
        date,
        {
          objectives: "Covered planned agenda for this session.",
          transcript:
            "Session ran as scheduled; outcomes logged and shared with the team.",
          attendanceCount: String(rand(20) + 3),
        },
        now,
      );
      if (Math.random() < 0.35 && person !== HEAD_USER_ID) {
        db.comments.push({
          id: uid("cm"),
          activityId: act.id,
          authorId: HEAD_USER_ID,
          text: "Nice work — logged and noted.",
          createdAt: iso(addDays(new Date(date + "T00:00:00Z"), 1)),
        });
      }
    }
  }

  // Multi-day flagship
  const multi = createActivity(
    db,
    {
      title: "Digital Literacy Training — SS2 Batch",
      type: "Program",
      description: "3-day digital literacy programme.",
      createdBy: "benson",
      startDate: iso(addDays(now, -1)),
      endDate: iso(addDays(now, 1)),
      startTime: "09:00",
      endTime: "13:00",
      responsibilityIds: ["r6", "r1"],
      seedDate: iso(addDays(now, -6)),
      location: "PSSDC ICT Hub, Computer Lab 2",
    },
    now,
  );
  submitDailyLog(
    db,
    multi.id,
    iso(addDays(now, -1)),
    {
      objectives:
        "Introduce spreadsheet basics; each participant opens and saves a workbook.",
      transcript:
        "We started with 34 participants present, walked through opening Excel, naming a sheet, and basic formulas like SUM. Most followed along, five needed one-on-one help with saving files correctly.",
      attendanceCount: "34",
      attendanceNotes: "2 facilitators",
    },
    now,
  );

  createActivity(
    db,
    {
      title: "E-Learning Portal Content Upload",
      type: "Task",
      description: "",
      createdBy: "benson",
      delegatedBy: HEAD_USER_ID,
      startDate: iso(addDays(now, 3)),
      endDate: iso(addDays(now, 3)),
      startTime: "09:00",
      responsibilityIds: ["r1"],
      seedDate: iso(addDays(now, -1)),
    },
    now,
  );

  const missedAct = createActivity(
    db,
    {
      title: "Content Review — July Newsletter",
      type: "Task",
      description: "",
      createdBy: "benson",
      startDate: iso(addDays(now, -10)),
      endDate: iso(addDays(now, -10)),
      startTime: "10:00",
      responsibilityIds: ["r5"],
      seedDate: iso(addDays(now, -14)),
    },
    now,
  );
  recomputeStatus(db, missedAct.id, now);

  createActivity(
    db,
    {
      title: "Weekly Unit Sync",
      type: "Meeting",
      description: "",
      createdBy: "benson",
      startDate: iso(now),
      endDate: iso(now),
      startTime: "14:00",
      responsibilityIds: ["r4"],
      seedDate: iso(now),
    },
    now,
  );

  const rev1 = createActivity(
    db,
    {
      title: "Virtual Cohort 5 — Week 2 Facilitation",
      type: "Program",
      description: "",
      createdBy: "omolara",
      startDate: iso(now),
      endDate: iso(now),
      startTime: "08:00",
      responsibilityIds: ["r2"],
      seedDate: iso(now),
      location: "Zoom — DLU Virtual Cohorts room",
    },
    now,
  );
  submitDailyLog(
    db,
    rev1.id,
    iso(now),
    {
      objectives: "Week 2 facilitation for Cohort 5.",
      transcript:
        "31 participants, ran smoothly, strong engagement in breakout discussions.",
      attendanceCount: "31",
    },
    now,
  );
  updateActivityWrapup(db, rev1.id, {
    initiativeTeamwork:
      "Co-facilitator stepped in to handle breakout rooms while I ran the main session, kept things moving without a hitch.",
    challenges:
      "A handful of participants had unstable connections and dropped in and out during the second half.",
    outcomes:
      "Cohort 5 is now fully caught up with Cohort 4 on the syllabus; ready for the joint assessment next week.",
    nextSteps:
      "Share the recording with the participants who dropped off, and confirm the assessment date with the Unit Head.",
  });

  const rev2 = createActivity(
    db,
    {
      title: "LMS Onboarding Module — Finance Basics",
      type: "Task",
      description: "",
      createdBy: "rufai",
      startDate: iso(addDays(now, -1)),
      endDate: iso(addDays(now, -1)),
      startTime: "10:00",
      responsibilityIds: ["r1"],
      seedDate: iso(addDays(now, -1)),
      location: "Remote — LMS Course Production workspace",
    },
    now,
  );
  submitDailyLog(
    db,
    rev2.id,
    iso(addDays(now, -1)),
    {
      objectives: "Finish onboarding module for finance basics course.",
      transcript:
        "Module built and QA'd, exported as SCORM package, ready for LMS upload.",
      attendanceCount: "",
    },
    now,
  );

  const rev3 = createActivity(
    db,
    {
      title: "Studio Podcast Recording — Episode 12",
      type: "Program",
      description: "",
      createdBy: "busari",
      startDate: iso(addDays(now, -2)),
      endDate: iso(addDays(now, -2)),
      startTime: "13:00",
      responsibilityIds: ["r10"],
      seedDate: iso(addDays(now, -2)),
    },
    now,
  );
  submitDailyLog(
    db,
    rev3.id,
    iso(addDays(now, -2)),
    {
      objectives: "Record episode 12.",
      transcript: "Recorded and rough-edited, uploaded to shared drive for review.",
      attendanceCount: "",
    },
    now,
  );

  (
    [
      "PSSDC Monthly Management Briefing",
      "LMS Studio Equipment Audit",
      "Unit Budget Review — Q3",
    ] as const
  ).forEach((t, i) => {
    const type = i === 0 ? ("Meeting" as const) : ("Task" as const);
    const d =
      i < 2 ? iso(addDays(now, -(3 + i * 4))) : iso(addDays(now, 5));
    const a = createActivity(
      db,
      {
        title: t,
        type,
        description: "",
        createdBy: HEAD_USER_ID,
        startDate: d,
        endDate: d,
        startTime: "10:00",
        responsibilityIds: [i === 0 ? "r4" : "r3"],
        seedDate: d,
      },
      now,
    );
    if (i < 2) {
      submitDailyLog(
        db,
        a.id,
        d,
        {
          objectives: "Handled as scheduled.",
          transcript: "Completed without issues.",
          attendanceCount: "",
        },
        now,
      );
    }
  });

  db.dms.push(
    {
      id: uid("dm"),
      a: "benson",
      b: HEAD_USER_ID,
      from: HEAD_USER_ID,
      text: "Morning Benson — can you circulate the agenda for tomorrow's unit sync?",
      at: "Mon 9:14 AM",
    },
    {
      id: uid("dm"),
      a: "benson",
      b: HEAD_USER_ID,
      from: "benson",
      text: "On it, will send before midday.",
      at: "Mon 9:20 AM",
    },
    {
      id: uid("dm"),
      a: "benson",
      b: HEAD_USER_ID,
      from: HEAD_USER_ID,
      text: "Also left a comment on your last activity log — nothing major, just a note on the attendance figure.",
      at: "Mon 9:22 AM",
    },
    {
      id: uid("dm"),
      a: "benson",
      b: "oyindamola",
      from: "oyindamola",
      text: "Heads up — studio booking calendar's been updated for August.",
      at: "11:02 AM",
    },
    {
      id: uid("dm"),
      a: "benson",
      b: "agbaje",
      from: "agbaje",
      text: "Sent you the SCORM export — let me know if it opens fine.",
      at: "Yesterday",
    },
    {
      id: uid("dm"),
      a: "benson",
      b: "rufai",
      from: "rufai",
      text: "Thanks for covering my session Tuesday 🙏",
      at: "Yesterday",
    },
  );

  db.calls.push(
    {
      id: uid("cl"),
      a: "benson",
      b: HEAD_USER_ID,
      from: HEAD_USER_ID,
      durationSec: 84,
      at: "Mon 9:11 AM",
    },
    {
      id: uid("cl"),
      a: "benson",
      b: HEAD_USER_ID,
      from: "benson",
      durationSec: 205,
      at: "Fri",
    },
  );

  db.community.push(
    {
      id: uid("cc"),
      from: "oyindamola",
      text: "Reminder: studio booking calendar updated for August — please check before scheduling.",
      at: "9:02 AM",
    },
    {
      id: uid("cc"),
      from: "rufai",
      text: "Noted, thanks!",
      at: "9:05 AM",
    },
    {
      id: uid("cc"),
      from: HEAD_USER_ID,
      text: "Also — well done everyone on last month's completion rate! Keep it up 🎉",
      at: "9:10 AM",
    },
    {
      id: uid("cc"),
      from: "omolara",
      text: "🙌",
      at: "9:11 AM",
    },
  );

  // Sweep missed for Unit Head
  db.activities
    .filter((a) => a.status === "missed")
    .forEach((a) => {
      pushNotification(
        db,
        HEAD_USER_ID,
        "activity_missed",
        `"${a.title}" (${firstName(userMap[a.createdBy].name)}) passed its date without being submitted — now marked Missed.`,
        now,
        a.id,
      );
    });

  return { db, users };
}
