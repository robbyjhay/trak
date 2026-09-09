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

/** @deprecated Prefer resolving head via users.find(u => u.role === "head"). */
export const HEAD_USER_ID = "babajide";

/** Stable head username used in seeds (UUID is assigned by Postgres). */
export const HEAD_USERNAME = "DLUARU";

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
  community:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  activity_created: "M12 5v14M5 12h14",
  activity_completed: "M20 6L9 17l-5-5",
  activity_missed:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v5 M12 16h.01",
  activity_reminder:
    "M12 2v10l4.5 4.5 M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z",
  broadcast:
    "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  announcement:
    "M3 11l18-5v12L3 14v-3z M11.6 16.8a3 3 0 1 1-5.8-1.6",
  profile_updated: "",
  library_submitted:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  library_new:
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM12 8v6M9 11h6",
  library_approved: "M20 6L9 17l-5-5",
  library_declined:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v5 M12 16h.01",
  mention:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v.01 M8 10h4a2 2 0 0 1 0 4H9v3",
  innovation_submitted:
    "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.5.8 1.3.8 2.1V18h6.4v-1.2c0-.8.3-1.6.8-2.1A7 7 0 0 0 12 2z",
  innovation_approved: "M20 6L9 17l-5-5",
  innovation_declined:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v5 M12 16h.01",
  innovation_implemented:
    "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
};

export const SAMPLE_TRANSCRIPT =
  "Session ran as planned. Objectives covered, participants engaged, no major issues to flag.";
