import "server-only";
import { createNow, iso } from "@/lib/dates";
import { HEAD_USER_ID } from "@/lib/constants";
import {
  canBroadcast,
  canComment,
  canDelegate,
  canManageTeamProfiles,
  canWipeCommunity,
} from "@/lib/permissions";
import { firstName, pickUserColor } from "@/lib/utils";
import {
  createActivity as createActivityMut,
  pushNotification as pushNotifMut,
  recomputeStatus,
  submitDailyLog as submitLogMut,
  updateActivityWrapup as wrapupMut,
  resetUid,
} from "@/lib/mockDb/mutations";
import type {
  Activity,
  Attendee,
  Comment,
  CreateActivityInput,
  DailyLog,
  Notification,
  SessionUser,
  SubmitDailyLogData,
  User,
  WrapupData,
} from "@/lib/types";
import { getState, nextUid, withState, type TrakState } from "./store";

function now(): Date {
  return createNow();
}

function userFromSession(state: TrakState, session: SessionUser): User | null {
  return state.users.find((u) => u.id === session.id) ?? null;
}

function syncUidCounter(state: TrakState) {
  // Keep mockDb uid helper in sync with persisted counter for seed-style ids
  resetUid(state.uidN);
}

/** After mockDb mutations (which use module-level uid), resync state.uidN. */
function catchUpUid(state: TrakState) {
  state.uidN = Math.max(state.uidN, extractMaxUid(state) + 1);
  resetUid(state.uidN);
}

export async function listUsers(): Promise<User[]> {
  const state = await getState();
  return structuredClone(state.users);
}

export async function getUser(id: string): Promise<User | null> {
  const state = await getState();
  const u = state.users.find((x) => x.id === id);
  return u ? structuredClone(u) : null;
}

export type ProfilePatch = Partial<
  Pick<
    User,
    | "designation"
    | "gradeLevel"
    | "sex"
    | "phone"
    | "stateOfOrigin"
    | "dateJoined"
    | "photoUrl"
  >
>;

export async function updateUserProfile(
  session: SessionUser,
  userId: string,
  patch: ProfilePatch,
): Promise<User> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (userId !== session.id && !canManageTeamProfiles(actor)) {
      throw new ServiceError(403, "Not allowed to edit this profile.");
    }
    const u = state.users.find((x) => x.id === userId);
    if (!u) throw new ServiceError(404, "User not found.");
    const allowed: (keyof ProfilePatch)[] = [
      "designation",
      "gradeLevel",
      "sex",
      "phone",
      "stateOfOrigin",
      "dateJoined",
      "photoUrl",
    ];
    for (const k of allowed) {
      if (patch[k] !== undefined) {
        (u as User)[k] = patch[k] as never;
      }
    }
    return structuredClone(u);
  });
}

export type NewUserInput = Pick<
  User,
  | "name"
  | "username"
  | "designation"
  | "gradeLevel"
  | "sex"
  | "phone"
  | "stateOfOrigin"
  | "dateJoined"
> & { color?: string };

/**
 * Head-only roster addition. Creates a contact entry — deliberately no login
 * credential (auth hashes are static/seeded server-side).
 */
export async function createUser(
  session: SessionUser,
  input: NewUserInput,
): Promise<User> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (!canManageTeamProfiles(actor)) {
      throw new ServiceError(403, "Only the Head can add members.");
    }
    const name = (input.name || "").trim();
    const username = (input.username || "").trim();
    const phone = (input.phone || "").trim();
    if (!name || !username || !phone) {
      throw new ServiceError(400, "Full name, username and phone are required.");
    }
    if (
      state.users.some(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      )
    ) {
      throw new ServiceError(409, "That username is already in use.");
    }
    const u: User = {
      id: nextUid(state, "usr"),
      name,
      username,
      role: "member",
      isSecretary: false,
      isCorps: false,
      color: input.color || pickUserColor(name),
      phone,
      designation: (input.designation || "").trim(),
      gradeLevel: (input.gradeLevel || "").trim(),
      sex: input.sex || "",
      stateOfOrigin: (input.stateOfOrigin || "").trim(),
      dateJoined: input.dateJoined || "",
      photoUrl: null,
    };
    state.users.push(u);
    return structuredClone(u);
  });
}

export async function createActivity(
  session: SessionUser,
  input: Omit<CreateActivityInput, "createdBy"> & {
    createdBy?: string;
    delegatedBy?: string | null;
  },
): Promise<Activity> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");

    const createdBy = input.createdBy || session.id;
    if (createdBy !== session.id && !canDelegate(actor)) {
      throw new ServiceError(403, "Only the Head can delegate activities.");
    }
    if (input.delegatedBy && !canDelegate(actor)) {
      throw new ServiceError(403, "Only the Head can set delegatedBy.");
    }

    syncUidCounter(state);
    const n = now();
    const act = createActivityMut(
      state.db,
      {
        title: input.title,
        type: input.type,
        description: input.description || "",
        createdBy,
        delegatedBy: input.delegatedBy ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        responsibilityIds: input.responsibilityIds || [],
        location: input.location,
      },
      n,
    );
    catchUpUid(state);

    if (act.createdBy !== HEAD_USER_ID) {
      pushNotifMut(
        state.db,
        HEAD_USER_ID,
        "activity_created",
        `${firstName(state.users.find((u) => u.id === act.createdBy)?.name || session.name)} created a new activity: "${act.title}".`,
        n,
        act.id,
      );
      catchUpUid(state);
    }

    return structuredClone(act);
  });
}

export async function getActivity(id: string): Promise<Activity | null> {
  const state = await getState();
  const act = state.db.activities.find((a) => a.id === id);
  return act ? structuredClone(act) : null;
}

export async function submitDailyLog(
  session: SessionUser,
  activityId: string,
  date: string,
  data: SubmitDailyLogData,
): Promise<{ log: DailyLog; activity: Activity }> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    const act = state.db.activities.find((a) => a.id === activityId);
    if (!act) throw new ServiceError(404, "Activity not found.");
    if (act.createdBy !== session.id && actor.role !== "head") {
      throw new ServiceError(403, "Not allowed to submit this log.");
    }
    const log = state.db.dailyLogs.find(
      (l) => l.activityId === activityId && l.date === date,
    );
    if (!log) throw new ServiceError(404, "Daily log not found.");

    syncUidCounter(state);
    const n = now();
    submitLogMut(state.db, activityId, date, data, n);
    catchUpUid(state);

    if (act.status === "completed" && act.createdBy !== HEAD_USER_ID) {
      pushNotifMut(
        state.db,
        HEAD_USER_ID,
        "activity_completed",
        `"${act.title}" (${firstName(state.users.find((u) => u.id === act.createdBy)?.name || "")}) was just completed.`,
        n,
        act.id,
      );
      catchUpUid(state);
    }

    return {
      log: structuredClone(log),
      activity: structuredClone(act),
    };
  });
}

export async function updateActivityWrapup(
  session: SessionUser,
  activityId: string,
  data: WrapupData,
): Promise<Activity> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    const act = state.db.activities.find((a) => a.id === activityId);
    if (!act) throw new ServiceError(404, "Activity not found.");
    if (act.createdBy !== session.id && actor.role !== "head") {
      throw new ServiceError(403, "Not allowed to update this activity.");
    }
    wrapupMut(state.db, activityId, data);
    return structuredClone(act);
  });
}

export async function addComment(
  session: SessionUser,
  activityId: string,
  text: string,
): Promise<Comment> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (!canComment(actor)) {
      throw new ServiceError(403, "Only the Head can comment.");
    }
    const act = state.db.activities.find((a) => a.id === activityId);
    if (!act) throw new ServiceError(404, "Activity not found.");
    const trimmed = text.trim();
    if (!trimmed) throw new ServiceError(400, "Comment text is required.");

    const comment: Comment = {
      id: nextUid(state, "cm"),
      activityId,
      authorId: session.id,
      text: trimmed,
      createdAt: iso(now()),
    };
    state.db.comments.push(comment);
    syncUidCounter(state);

    if (act.createdBy !== session.id) {
      const n = now();
      pushNotifMut(
        state.db,
        act.createdBy,
        "comment",
        `${firstName(actor.name)} commented on "${act.title}".`,
        n,
        activityId,
      );
      catchUpUid(state);
    }

    return structuredClone(comment);
  });
}

export async function setLogRsvpToken(
  session: SessionUser,
  logId: string,
  token: string,
): Promise<DailyLog> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    const log = state.db.dailyLogs.find((l) => l.id === logId);
    if (!log) throw new ServiceError(404, "Log not found.");
    const act = state.db.activities.find((a) => a.id === log.activityId);
    if (!act) throw new ServiceError(404, "Activity not found.");
    if (act.createdBy !== session.id && actor.role !== "head") {
      throw new ServiceError(403, "Not allowed.");
    }
    log.rsvpToken = token;
    return structuredClone(log);
  });
}

/** Public RSVP — no session required. */
export async function addRsvpAttendee(
  logId: string,
  attendee: Omit<Attendee, "source" | "at"> & { source?: Attendee["source"] },
): Promise<{ ok: true }> {
  return withState((state) => {
    const log = state.db.dailyLogs.find((l) => l.id === logId);
    if (!log) throw new ServiceError(404, "Attendance list not found.");
    const name = (attendee.name || "").trim();
    if (!name) throw new ServiceError(400, "Name is required.");
    log.attendees = log.attendees || [];
    log.attendees.push({
      name,
      phone: (attendee.phone || "").trim(),
      email: (attendee.email || "").trim(),
      source: attendee.source || "link",
      at: iso(now()),
    });
    return { ok: true as const };
  });
}

export async function sendDm(
  session: SessionUser,
  toId: string,
  text: string,
): Promise<{ id: string }> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (!state.users.find((u) => u.id === toId)) {
      throw new ServiceError(404, "Recipient not found.");
    }
    const trimmed = text.trim();
    if (!trimmed) throw new ServiceError(400, "Message text is required.");
    const n = now();
    const id = nextUid(state, "dm");
    state.db.dms.push({
      id,
      a: session.id,
      b: toId,
      from: session.id,
      text: trimmed,
      at: "Just now",
    });
    syncUidCounter(state);
    pushNotifMut(
      state.db,
      toId,
      "dm",
      `${firstName(actor.name)} sent you a message.`,
      n,
    );
    catchUpUid(state);
    return { id };
  });
}

export async function sendCommunity(
  session: SessionUser,
  text: string,
): Promise<{ id: string }> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    const trimmed = text.trim();
    if (!trimmed) throw new ServiceError(400, "Message text is required.");
    const id = nextUid(state, "cc");
    state.db.community.push({
      id,
      from: session.id,
      text: trimmed,
      at: "Just now",
    });
    return { id };
  });
}

export async function wipeCommunity(session: SessionUser): Promise<void> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (!canWipeCommunity(actor)) {
      throw new ServiceError(403, "Only the Head can wipe community chat.");
    }
    state.db.community.splice(0, state.db.community.length);
  });
}

export async function sendBroadcast(
  session: SessionUser,
  text: string,
): Promise<{ id: string }> {
  return withState((state) => {
    const actor = userFromSession(state, session);
    if (!actor) throw new ServiceError(401, "Unauthorized");
    if (!canBroadcast(actor)) {
      throw new ServiceError(403, "Not allowed to broadcast.");
    }
    const trimmed = text.trim();
    if (!trimmed) throw new ServiceError(400, "Broadcast text is required.");
    const n = now();
    const id = nextUid(state, "bc");
    state.db.broadcasts.push({
      id,
      from: session.id,
      text: trimmed,
      at: iso(n),
    });
    syncUidCounter(state);
    for (const u of state.users) {
      if (u.id !== session.id) {
        pushNotifMut(
          state.db,
          u.id,
          "broadcast",
          `Broadcast from ${actor.name}: ${trimmed}`,
          n,
        );
      }
    }
    catchUpUid(state);
    return { id };
  });
}

export async function markNotificationRead(
  session: SessionUser,
  id: string,
): Promise<void> {
  return withState((state) => {
    const n = state.db.notifications.find((x) => x.id === id);
    if (!n) throw new ServiceError(404, "Notification not found.");
    if (n.userId !== session.id) {
      throw new ServiceError(403, "Not your notification.");
    }
    n.read = true;
  });
}

export async function markAllNotificationsRead(
  session: SessionUser,
): Promise<void> {
  return withState((state) => {
    for (const n of state.db.notifications) {
      if (n.userId === session.id) n.read = true;
    }
  });
}

export async function myNotifications(
  session: SessionUser,
): Promise<Notification[]> {
  const state = await getState();
  return structuredClone(
    state.db.notifications
      .filter((n) => n.userId === session.id)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  );
}

export async function recomputeAllStatuses(): Promise<void> {
  return withState((state) => {
    const n = now();
    for (const act of state.db.activities) {
      recomputeStatus(state.db, act.id, n);
    }
  });
}

function extractMaxUid(state: TrakState): number {
  let max = state.uidN - 1;
  const re = /_(\d+)$/;
  const scan = (id: string) => {
    const m = re.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  };
  for (const a of state.db.activities) scan(a.id);
  for (const l of state.db.dailyLogs) scan(l.id);
  for (const c of state.db.comments) scan(c.id);
  for (const d of state.db.dms) scan(d.id);
  for (const m of state.db.community) scan(m.id);
  for (const b of state.db.broadcasts) scan(b.id);
  for (const n of state.db.notifications) scan(n.id);
  return max;
}

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
