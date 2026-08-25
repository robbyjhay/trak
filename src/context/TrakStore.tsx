"use client";
/* eslint-disable */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createNow } from "@/lib/dates";
import type {
  Activity,
  Attendee,
  Attachment,
  Comment,
  CreateActivityInput,
  DailyLog,
  Notification,
  NotifType,
  Responsibility,
  SessionUser,
  SubmitDailyLogData,
  TrakDb,
  User,
  WrapupData,
  SendMessageAttachmentInput,
} from "@/lib/types";
import {
  activitiesFor as activitiesForMut,
  allVisibleActivities,
  bucket as bucketMut,
  createEmptyDb,
  toggleActivityHidden as toggleHiddenMut,
  softDeleteActivity as softDeleteMut,
  deactivateResponsibility as deactivateRespMut,
} from "@/lib/mockDb";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";

interface ToastState {
  title: string;
  desc: string;
  show: boolean;
}

export interface BootstrapSnapshot {
  users: User[];
  db: TrakDb;
  responsibilities: Responsibility[];
  serverTime?: string;
}

interface BootstrapResponse extends BootstrapSnapshot {}

function normalizeDb(db: Partial<TrakDb> | null | undefined): TrakDb {
  const empty = createEmptyDb();
  return {
    activities: db?.activities ?? empty.activities,
    dailyLogs: db?.dailyLogs ?? empty.dailyLogs,
    comments: db?.comments ?? empty.comments,
    dms: db?.dms ?? empty.dms,
    calls: db?.calls ?? empty.calls,
    community: db?.community ?? empty.community,
    broadcasts: db?.broadcasts ?? empty.broadcasts,
    notifications: db?.notifications ?? empty.notifications,
  };
}

interface TrakStoreValue {
  ready: boolean;
  loadError: string | null;
  now: Date;
  users: User[];
  userMap: Record<string, User>;
  db: TrakDb;
  responsibilities: Responsibility[];
  sessionUser: User;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  dismissedPhotoNudges: Set<string>;
  dismissPhotoNudge: (id: string) => void;
  dismissedNotifNudges: Set<string>;
  dismissNotifNudge: (id: string) => void;
  toast: ToastState;
  showToast: (title: string, desc: string) => void;
  refresh: () => Promise<void>;
  createActivity: (
    input: Omit<CreateActivityInput, "createdBy"> & { createdBy?: string },
  ) => Promise<Activity>;
  submitDailyLog: (
    activityId: string,
    date: string,
    data: SubmitDailyLogData,
  ) => Promise<void>;
  updateActivityWrapup: (
    activityId: string,
    data: WrapupData,
  ) => Promise<void>;
  updateActivityEndDate: (
    activityId: string,
    endDate: string,
  ) => Promise<void>;
  pushNotification: (
    userId: string,
    type: NotifType,
    text: string,
    activityId?: string | null,
  ) => void;
  addComment: (
    activityId: string,
    text: string,
    authorId?: string,
  ) => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  updateUserProfile: (userId: string, patch: Partial<User>) => Promise<void>;
  addUser: (u: {
    name: string;
    username?: string;
    email?: string;
    designation?: string;
    gradeLevel?: string;
    sex?: string;
    phone?: string;
    stateOfOrigin?: string;
    dateJoined?: string;
    roleType?: "member" | "secretary" | "corps" | "intern";
  }) => Promise<{ username: string; starterPassword: string }>;
  createResponsibility: (input: {
    code: string;
    name: string;
    desc: string;
    deliverables: string[];
  }) => Promise<Responsibility>;
  updateResponsibility: (
    id: string,
    input: {
      code: string;
      name: string;
      desc: string;
      deliverables: string[];
    },
  ) => Promise<Responsibility>;
  sendDm: (toId: string, text: string, attachments?: SendMessageAttachmentInput[]) => Promise<void>;
  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[]) => Promise<void>;
  wipeCommunity: () => Promise<void>;
  deleteDmMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  deleteCommunityMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  sendBroadcast: (text: string) => Promise<void>;
  recordCall: (partnerId: string, durationSec: number) => Promise<void>;
  addRsvpAttendee: (logId: string, attendee: Attendee) => Promise<void>;
  setLogRsvpToken: (logId: string, token?: string) => Promise<string>;
  toggleActivityHidden: (activityId: string) => Promise<void>;
  softDeleteActivity: (activityId: string) => Promise<void>;
  deactivateResponsibility: (id: string) => Promise<void>;
  activitiesFor: (userId: string) => Activity[];
  bucket: (userId: string) => ReturnType<typeof bucketMut>;
  getActivity: (id: string) => Activity | undefined;
  getLogs: (activityId: string) => DailyLog[];
  getComments: (activityId: string) => Comment[];
  myNotifications: () => Notification[];
}

const TrakStoreContext = createContext<TrakStoreValue | null>(null);

function emptyDb(): TrakDb {
  return createEmptyDb();
}

export function TrakStoreProvider({
  session,
  initialBootstrap = null,
  children,
}: {
  session: SessionUser;
  /** Server-loaded snapshot — when present, dashboard paints immediately. */
  initialBootstrap?: BootstrapSnapshot | null;
  children: ReactNode;
}) {
  const nowRef = useRef(createNow());
  const hadInitial = Boolean(
    initialBootstrap && Array.isArray(initialBootstrap.users),
  );
  const [ready, setReady] = useState(hadInitial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const stateRef = useRef<{
    db: TrakDb;
    users: User[];
    responsibilities: Responsibility[];
  }>({
    db: emptyDb(),
    users: [],
    responsibilities: [],
  });
  const seededFromServer = useRef(false);
  if (!seededFromServer.current && hadInitial && initialBootstrap) {
    seededFromServer.current = true;
    stateRef.current = {
      users: initialBootstrap.users,
      db: normalizeDb(initialBootstrap.db),
      responsibilities: initialBootstrap.responsibilities || [],
    };
    if (initialBootstrap.serverTime) {
      const t = new Date(initialBootstrap.serverTime);
      if (!Number.isNaN(t.getTime())) nowRef.current = t;
    }
  }

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dismissedPhoto, setDismissedPhoto] = useState<Set<string>>(
    () => new Set(),
  );
  const [dismissedNotif, setDismissedNotif] = useState<Set<string>>(
    () => new Set(),
  );
  const [toast, setToast] = useState<ToastState>({
    title: "",
    desc: "",
    show: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const applySnapshot = useCallback(
    (users: User[], db: TrakDb, responsibilities: Responsibility[]) => {
      stateRef.current = { users, db, responsibilities };
      bump();
    },
    [bump],
  );

  const refresh = useCallback(async () => {
    const data = await apiGet<BootstrapResponse>("/api/bootstrap", {
      timeoutMs: 25_000,
    });
    if (!data || !Array.isArray(data.users) || !data.db) {
      throw new ApiError(500, "Invalid bootstrap response from server");
    }
    applySnapshot(
      data.users,
      normalizeDb(data.db),
      data.responsibilities || [],
    );
    if (data.serverTime) {
      const t = new Date(data.serverTime);
      if (!Number.isNaN(t.getTime())) nowRef.current = t;
    }
  }, [applySnapshot]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Client fetch only when the server did not already provide a snapshot.
  // Do NOT abort on unmount — Strict Mode abort was leaving ready=false forever.
  useEffect(() => {
    if (hadInitial) return;

    let alive = true;
    (async () => {
      try {
        await refreshRef.current();
        if (!alive) return;
        setLoadError(null);
        setReady(true);
      } catch (err) {
        if (!alive) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load data",
        );
        setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hadInitial]);

  const db = stateRef.current.db;
  const users = stateRef.current.users;
  const responsibilities = stateRef.current.responsibilities;
  // Subscribe to version so mutations that replace state trigger re-render.
  void version;

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>,
    [version, users],
  );

  const sessionUser = userMap[session.id] || {
    id: session.id,
    name: session.name,
    username: session.username,
    role: session.role,
    isSecretary: session.isSecretary,
    isCorps: session.isCorps,
    photoUrl: null,
    color: "#8a6a1f",
    phone: "",
    designation: "",
    gradeLevel: "",
    sex: "",
    stateOfOrigin: "",
    dateJoined: "",
  };

  const showToast = useCallback((title: string, desc: string) => {
    setToast({ title, desc, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      4200,
    );
  }, []);

  const maybeOsNotify = useCallback(
    (userId: string, text: string) => {
      if (
        notificationsEnabled &&
        session.id === userId &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Trak", {
            body: text,
            tag: "trak-" + Math.random().toString(36).slice(2),
          });
        } catch {
          /* in-app bell still has it */
        }
      }
    },
    [notificationsEnabled, session.id],
  );

  const mergeNotifications = useCallback(
    (notifications?: Notification[]) => {
      if (!notifications) return;
      const mine = notifications.filter((n) => n.userId === session.id);
      const prev = stateRef.current.db.notifications;
      const prevUnread = new Set(
        prev
          .filter((n) => n.userId === session.id && !n.read)
          .map((n) => n.id),
      );
      for (const n of mine) {
        if (!prevUnread.has(n.id) && !n.read) {
          maybeOsNotify(n.userId, n.text);
        }
      }
      stateRef.current.db.notifications = notifications;
    },
    [maybeOsNotify, session.id],
  );

  // Lightweight poll for notifications; full refresh less often
  useEffect(() => {
    if (!ready) return;
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      // Every 5th tick (~75s) do a full scoped refresh; otherwise poll only
      if (ticks % 5 === 0) {
        refresh().catch(() => {});
        return;
      }
      apiGet<{
        notifications: Notification[];
        unreadNotifications: number;
        serverTime: string;
      }>("/api/bootstrap?mode=poll")
        .then((data) => {
          if (data.notifications) {
            mergeNotifications(data.notifications);
            bump();
          }
          if (data.serverTime) {
            const t = new Date(data.serverTime);
            if (!Number.isNaN(t.getTime())) nowRef.current = t;
          }
        })
        .catch(() => {
          /* ignore background poll errors */
        });
    }, 15_000);
    return () => clearInterval(id);
  }, [ready, refresh, mergeNotifications, bump]);

  const value: TrakStoreValue = {
    ready,
    loadError,
    now: nowRef.current,
    users,
    userMap,
    db,
    responsibilities,
    sessionUser,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissedPhotoNudges: dismissedPhoto,
    dismissPhotoNudge: (id) =>
      setDismissedPhoto((s) => new Set(s).add(id)),
    dismissedNotifNudges: dismissedNotif,
    dismissNotifNudge: (id) =>
      setDismissedNotif((s) => new Set(s).add(id)),
    toast,
    showToast,
    refresh,
    createActivity: async (input) => {
      const res = await apiSend<{
        activity: Activity;
        dailyLogs: DailyLog[];
        notifications: Notification[];
      }>("/api/activities", "POST", {
        ...input,
        createdBy: input.createdBy || session.id,
      });
      stateRef.current.db.activities.push(res.activity);
      stateRef.current.db.dailyLogs.push(...(res.dailyLogs || []));
      mergeNotifications(res.notifications);
      bump();
      return res.activity;
    },
    submitDailyLog: async (activityId, date, data) => {
      const res = await apiSend<{
        log: DailyLog;
        activity: Activity;
        notifications: Notification[];
      }>(`/api/activities/${activityId}/logs`, "POST", { date, ...data });
      const logIdx = stateRef.current.db.dailyLogs.findIndex(
        (l) => l.activityId === activityId && l.date === date,
      );
      if (logIdx >= 0) stateRef.current.db.dailyLogs[logIdx] = res.log;
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      mergeNotifications(res.notifications);
      bump();
    },
    updateActivityWrapup: async (activityId, data) => {
      const res = await apiSend<{ activity: Activity }>(
        `/api/activities/${activityId}`,
        "PATCH",
        { action: "wrapup", ...data },
      );
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      bump();
    },
    updateActivityEndDate: async (activityId, endDate) => {
      const res = await apiSend<{ activity: Activity }>(
        `/api/activities/${activityId}`,
        "PATCH",
        { action: "updateDates", endDate },
      );
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      // Also fetch updated logs since they might have changed
      const logsRes = await apiGet<{ dailyLogs: DailyLog[] }>(
        `/api/activities/${activityId}`
      );
      if (logsRes && logsRes.dailyLogs) {
        stateRef.current.db.dailyLogs = stateRef.current.db.dailyLogs
          .filter((l) => l.activityId !== activityId)
          .concat(logsRes.dailyLogs);
      }
      bump();
    },
    // Server owns notifications; client no-op kept for interface stability
    pushNotification: () => {
      /* notifications are created server-side */
    },
    addComment: async (activityId, text) => {
      const res = await apiSend<{
        comment: Comment;
        notifications: Notification[];
      }>(`/api/activities/${activityId}/comments`, "POST", { text });
      stateRef.current.db.comments.push(res.comment);
      mergeNotifications(res.notifications);
      bump();
    },
    markNotifRead: async (id) => {
      const res = await apiSend<{ notifications: Notification[] }>(
        "/api/notifications",
        "PATCH",
        { id },
      );
      // Merge only this user's notifs into full list
      const others = stateRef.current.db.notifications.filter(
        (n) => n.userId !== session.id,
      );
      stateRef.current.db.notifications = [
        ...others,
        ...(res.notifications || []),
      ];
      bump();
    },
    markAllNotifsRead: async () => {
      const res = await apiSend<{ notifications: Notification[] }>(
        "/api/notifications",
        "PATCH",
        { all: true },
      );
      const others = stateRef.current.db.notifications.filter(
        (n) => n.userId !== session.id,
      );
      stateRef.current.db.notifications = [
        ...others,
        ...(res.notifications || []),
      ];
      bump();
    },
    updateUserProfile: async (userId, patch) => {
      const res = await apiSend<{ user: User }>(
        `/api/users/${userId}`,
        "PATCH",
        patch,
      );
      const idx = stateRef.current.users.findIndex((u) => u.id === userId);
      if (idx >= 0) stateRef.current.users[idx] = res.user;
      else stateRef.current.users.push(res.user);
      bump();
    },
    addUser: async (u) => {
      const res = await apiSend<{
        user: User;
        credentials: { username: string; starterPassword: string };
      }>("/api/users", "POST", {
        name: u.name,
        username: u.username,
        email: u.email,
        designation: u.designation,
        gradeLevel: u.gradeLevel,
        sex: u.sex,
        phone: u.phone,
        stateOfOrigin: u.stateOfOrigin,
        dateJoined: u.dateJoined,
        roleType: u.roleType,
      });
      stateRef.current.users.push(res.user);
      bump();
      return res.credentials;
    },
    createResponsibility: async (input) => {
      const res = await apiSend<{ responsibility: Responsibility }>(
        "/api/responsibilities",
        "POST",
        input,
      );
      stateRef.current.responsibilities.push(res.responsibility);
      bump();
      return res.responsibility;
    },
    updateResponsibility: async (id, input) => {
      const res = await apiSend<{ responsibility: Responsibility }>(
        `/api/responsibilities/${id}`,
        "PATCH",
        input,
      );
      const list = stateRef.current.responsibilities;
      const i = list.findIndex((r) => r.id === id);
      if (i >= 0) list[i] = res.responsibility;
      bump();
      return res.responsibility;
    },
    sendDm: async (toId, text, attachments) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.dms.push({
        id: tempId,
        a: session.id,
        b: toId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
      });
      bump();
      try {
        const res = await apiSend<{
          dms: typeof db.dms;
          notifications: Notification[];
        }>("/api/messages/dms", "POST", { toId, text, attachments });
        stateRef.current.db.dms = res.dms;
        mergeNotifications(res.notifications);
      } finally {
        bump();
      }
    },
    sendCommunity: async (text, attachments) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.community.push({
        id: tempId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: null,
      });
      bump();
      try {
        const res = await apiSend<{ community: typeof db.community }>(
          "/api/messages/community",
          "POST",
          { text, attachments },
        );
        stateRef.current.db.community = res.community;
      } finally {
        bump();
      }
    },
    recordCall: async (partnerId, durationSec) => {
      const res = await apiSend<{ calls: typeof db.calls }>(
        "/api/messages/calls",
        "POST",
        { toId: partnerId, durationSec },
      );
      stateRef.current.db.calls = res.calls;
      bump();
    },
    wipeCommunity: async () => {
      const res = await apiSend<{ community: typeof db.community }>(
        "/api/messages/community",
        "DELETE",
      );
      stateRef.current.db.community = res.community;
      bump();
    },
    deleteDmMessage: async (messageId, forEveryone) => {
      if (forEveryone) {
        const msg = stateRef.current.db.dms.find(m => m.id === messageId);
        if (msg) msg.isDeleted = true;
      } else {
        stateRef.current.db.dms = stateRef.current.db.dms.filter(m => m.id !== messageId);
      }
      bump();
      try {
        const res = await apiSend<{
          dms: typeof db.dms;
          notifications: Notification[];
        }>(`/api/messages/dms/${messageId}`, "DELETE", { forEveryone });
        stateRef.current.db.dms = res.dms;
        mergeNotifications(res.notifications);
      } finally {
        bump();
      }
    },
    deleteCommunityMessage: async (messageId, forEveryone) => {
      if (forEveryone) {
        const msg = stateRef.current.db.community.find(m => m.id === messageId);
        if (msg) msg.isDeleted = true;
      } else {
        stateRef.current.db.community = stateRef.current.db.community.filter(m => m.id !== messageId);
      }
      bump();
      try {
        const res = await apiSend<{ community: typeof db.community }>(
          `/api/messages/community/${messageId}`,
          "DELETE",
          { forEveryone },
        );
        stateRef.current.db.community = res.community;
      } finally {
        bump();
      }
    },
    sendBroadcast: async (text) => {
      const res = await apiSend<{
        broadcasts: typeof db.broadcasts;
        notifications: Notification[];
      }>("/api/messages/broadcasts", "POST", { text });
      stateRef.current.db.broadcasts = res.broadcasts;
      mergeNotifications(res.notifications);
      bump();
    },
    addRsvpAttendee: async (logId, attendee) => {
      await apiSend("/api/rsvp", "POST", {
        logId,
        name: attendee.name,
        phone: attendee.phone,
        email: attendee.email,
      });
      await refresh();
    },
    setLogRsvpToken: async (logId, _clientToken) => {
      const log = stateRef.current.db.dailyLogs.find((l) => l.id === logId);
      if (!log) throw new Error("Log not found");
      // Server generates cryptographic token; client-supplied value is ignored.
      const res = await apiSend<{ log: DailyLog; token: string }>(
        `/api/activities/${log.activityId}/logs/${logId}/rsvp-token`,
        "POST",
        {},
      );
      const idx = stateRef.current.db.dailyLogs.findIndex((l) => l.id === logId);
      if (idx >= 0) {
        // Keep raw token in client memory for link generation only (not from server lists).
        stateRef.current.db.dailyLogs[idx] = {
          ...res.log,
          rsvpToken: res.token,
        };
      }
      bump();
      return res.token;
    },
    toggleActivityHidden: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "toggleHidden",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.hidden = !act.hidden;
      bump();
    },
    softDeleteActivity: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "softDelete",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.softDeletedAt = new Date().toISOString();
      bump();
    },
    deactivateResponsibility: async (id) => {
      await apiSend(`/api/responsibilities/${id}`, "PATCH", {
        action: "toggleActive",
      });
      const r = stateRef.current.responsibilities.find((x) => x.id === id);
      if (r) r.isActive = !r.isActive;
      bump();
    },
    activitiesFor: (userId) => activitiesForMut(db, userId),
    bucket: (userId) => bucketMut(db, userId),
    getActivity: (id) => db.activities.find((a) => a.id === id),
    getLogs: (activityId) =>
      db.dailyLogs
        .filter((l) => l.activityId === activityId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    getComments: (activityId) =>
      db.comments.filter((c) => c.activityId === activityId),
    myNotifications: () =>
      db.notifications
        .filter((n) => n.userId === session.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  };

  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-paper text-ink-soft"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-aztec"
            aria-hidden
          />
          <div className="mb-2 font-display text-lg font-semibold text-ink">
            Loading Trak…
          </div>
          <div className="text-sm">Syncing with server</div>
        </div>
      </div>
    );
  }

  if (loadError && users.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink-soft">
        <div className="max-w-md text-center">
          <div className="mb-2 font-display text-lg font-semibold text-critical">
            Could not load data
          </div>
          <p className="mb-4 text-sm">{loadError}</p>
          <button
            type="button"
            className="cursor-pointer rounded-xl bg-aztec px-5 py-2.5 text-sm font-bold text-paper"
            onClick={() => {
              setReady(false);
              setLoadError(null);
              refreshRef
                .current()
                .then(() => {
                  setLoadError(null);
                  setReady(true);
                })
                .catch((e) => {
                  setLoadError(
                    e instanceof ApiError ? e.message : "Failed to load data",
                  );
                  setReady(true);
                });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TrakStoreContext.Provider value={value}>
      {children}
    </TrakStoreContext.Provider>
  );
}

export function useTrak() {
  const ctx = useContext(TrakStoreContext);
  if (!ctx) throw new Error("useTrak must be used within TrakStoreProvider");
  return ctx;
}

export type { Attachment };
