import type { ActivityType, NotifType } from "./types";

export const TYPE_COLOR: Record<ActivityType, string> = {
  Meeting: "var(--cat-meeting)",
  Project: "var(--cat-project)",
  Program: "var(--cat-program)",
  Task: "var(--cat-task)",
};

export const TYPE_COLOR_TW: Record<ActivityType, string> = {
  Meeting: "bg-cat-meeting",
  Project: "bg-cat-project",
  Program: "bg-cat-program",
  Task: "bg-cat-task",
};

export const HEAD_USER_ID = "babajide";

export const SEQ_RAMP = [
  "#e3f3ea",
  "#bfe3cf",
  "#8fcdae",
  "#4fa97d",
  "#1f7a5c",
  "#0d4a34",
];

export function rampColor(v: number, max: number): string {
  if (max <= 0) return SEQ_RAMP[0];
  const idx = Math.min(
    SEQ_RAMP.length - 1,
    Math.round((v / max) * (SEQ_RAMP.length - 1)),
  );
  return SEQ_RAMP[idx];
}

export const NOTIF_PATHS: Record<NotifType, string> = {
  comment:
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  dm: "M22 2L11 13 M22 2l-7 20-4-9-9-4z",
  activity_created: "M12 5v14M5 12h14",
  activity_completed: "M20 6L9 17l-5-5",
  activity_missed:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v5 M12 16h.01",
  broadcast:
    "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
};

export const SAMPLE_TRANSCRIPT =
  "Session ran as planned. Objectives covered, participants engaged, no major issues to flag.";
