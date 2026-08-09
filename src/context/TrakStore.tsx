"use client";

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
  SessionUser,
  SubmitDailyLogData,
  TrakDb,
  User,
  WrapupData,
} from "@/lib/types";
import {
  activitiesFor as activitiesForMut,
  bucket as bucketMut,
  createEmptyDb,
} from "@/lib/mockDb";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";

interface ToastState {
  title: string;
  desc: string;
  show: boolean;
}

interface BootstrapResponse {
  users: User[];
  db: TrakDb;
  serverTime: string;
}

interface TrakStoreValue {
  ready: boolean;
  loadError: string | null;
  now: Date;
  users: User[];
  userMap: Record<string, User>;
  db: TrakDb;
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
  updateUserProfile: (
    userId: string,
    patch: Partial<
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
    >,
  ) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  sendDm: (toId: string, text: string) => Promise<void>;
  sendCommunity: (text: string) => Promise<void>;
  wipeCommunity: () => Promise<void>;
  sendBroadcast: (text: string) => Promise<void>;
  addRsvpAttendee: (logId: string, attendee: Attendee) => Promise<void>;
  setLogRsvpToken: (logId: string, token: string) => Promise<void>;
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
  children,
}: {
  session: SessionUser;
  children: ReactNode;
}) {
  const nowRef = useRef(createNow());
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const stateRef = useRef<{ db: TrakDb; users: User[] }>({
    db: emptyDb(),
    users: [],
  });

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
    (users: User[], db: TrakDb) => {
      stateRef.current = { users, db };
      bump();
    },
    [bump],
  );

  const refresh = useCallback(async () => {
    const data = await apiGet<BootstrapResponse>("/api/bootstrap");
    applySnapshot(data.users, data.db);
    if (data.serverTime) {
      const t = new Date(data.serverTime);
      if (!Number.isNaN(t.getTime())) nowRef.current = t;
    }
  }, [applySnapshot]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) {
          setReady(true);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Failed to load data",
          );
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Soft poll so RSVP/DM updates appear without full reload
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      refresh().catch(() => {
        /* ignore background poll errors */
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const db = stateRef.current.db;
  const users = stateRef.current.users;
  // version drives re-render after mutations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _v = version;

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>,
    // users mutates by replacement; version drives refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const value: TrakStoreValue = {
    ready,
    loadError,
    now: nowRef.current,
    users,
    userMap,
    db,
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
      const res = await apiSend<{ user: User }>("/api/users", "POST", {
        name: u.name,
        username: u.username,
        designation: u.designation,
        gradeLevel: u.gradeLevel,
        sex: u.sex,
        phone: u.phone,
        stateOfOrigin: u.stateOfOrigin,
        dateJoined: u.dateJoined,
        color: u.color,
      });
      stateRef.current.users.push(res.user);
      bump();
    },
    sendDm: async (toId, text) => {
      const res = await apiSend<{
        dms: typeof db.dms;
        notifications: Notification[];
      }>("/api/messages/dms", "POST", { toId, text });
      stateRef.current.db.dms = res.dms;
      mergeNotifications(res.notifications);
      bump();
    },
    sendCommunity: async (text) => {
      const res = await apiSend<{ community: typeof db.community }>(
        "/api/messages/community",
        "POST",
        { text },
      );
      stateRef.current.db.community = res.community;
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
    setLogRsvpToken: async (logId, token) => {
      const log = stateRef.current.db.dailyLogs.find((l) => l.id === logId);
      if (!log) return;
      const res = await apiSend<{ log: DailyLog }>(
        `/api/activities/${log.activityId}/logs/${logId}/rsvp-token`,
        "POST",
        { token },
      );
      const idx = stateRef.current.db.dailyLogs.findIndex((l) => l.id === logId);
      if (idx >= 0) stateRef.current.db.dailyLogs[idx] = res.log;
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
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-soft">
        <div className="text-center">
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
              refresh()
                .then(() => setReady(true))
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
