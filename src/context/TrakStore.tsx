"use client";
import { TrakLoader } from "@/components/ui/TrakLoader";
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
  Announcement,
  AnnouncementReaction,
  Attendee,
  Attachment,
  Comment,
  CreateActivityInput,
  DailyLog,
  LinkPreview,
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
import { useSignaling } from "@/hooks/useSignaling";
// Phase 1 offline-first: IndexedDB persistence (SSR-safe, never throws).
import {
  countFailedOutbox,
  countPendingOutbox,
  loadCachedBootstrap,
  persistBootstrap,
  persistSessionIdentity,
  removeOutboxByTempId,
  resetFailedOutbox,
} from "@/lib/offline/db";
import { syncRscCacheSession } from "@/lib/sw/rsc-cache-session";
// Phase 2 offline mutations: queue-on-offline + ordered sync engine.
import {
  isQueuedForSync,
  sendQueued,
  startAutoSync,
  syncOutbox,
} from "@/lib/offline/sync";
import {
  buildOfflineActivity,
  buildOfflineAnnouncement,
  buildOfflineAttendee,
  buildOfflineBroadcast,
  buildOfflineComment,
  buildOfflineDailyLog,
  buildOfflineResponsibility,
  isTempId,
  mergeOfflineDailyLog,
  newTempId,
} from "@/lib/offline/pending";

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
    announcements: db?.announcements ?? empty.announcements,
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
  /** Queued offline mutations awaiting replay (pending + sending). */
  pendingMutations: number;
  /** Queued mutations that failed permanently and need attention. */
  failedMutations: number;
  /** True while the sync engine is replaying the outbox. */
  isSyncing: boolean;
  /** Replay the outbox now, then reconcile with the server. */
  syncNow: () => Promise<void>;
  /** Re-queue permanently-failed mutations and replay them. */
  retryFailedMutations: () => Promise<void>;
  createActivity: (
    input: Omit<CreateActivityInput, "createdBy"> & { createdBy?: string },
  ) => Promise<Activity>;
  respondToCollaborate: (
    activityId: string,
    action: "accept" | "decline",
  ) => Promise<void>;
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
  updateActivityMetadata: (
    activityId: string,
    data: any,
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
  markNotifsRead: (ids: string[]) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  markDmsRead: (withUserId: string) => Promise<void>;
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
  sendDm: (toId: string, text: string, attachments?: SendMessageAttachmentInput[], replyToId?: string | null) => Promise<void>;
  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[], mentions?: { userId: string; position: number; length: number }[], replyToId?: string | null) => Promise<void>;
  wipeCommunity: () => Promise<void>;
  deleteDmMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  deleteCommunityMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  sendBroadcast: (text: string) => Promise<void>;
  sendAnnouncement: (text: string) => Promise<void>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;
  reactToAnnouncement: (announcementId: string, emoji: string) => Promise<void>;
  recordCall: (partnerId: string, durationSec: number) => Promise<void>;
  addRsvpAttendee: (logId: string, attendee: Attendee) => Promise<void>;
  setLogRsvpToken: (logId: string, token?: string) => Promise<string>;
  toggleActivityHidden: (activityId: string) => Promise<void>;
  softDeleteActivity: (activityId: string) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  deactivateResponsibility: (id: string) => Promise<void>;
  requestException: (activityId: string, explanation: string) => Promise<void>;
  approveException: (activityId: string) => Promise<void>;
  rejectException: (activityId: string) => Promise<void>;
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

import { usePushNotifications } from "@/hooks/usePushNotifications";

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
    const normalized = normalizeDb(data.db);
    const responsibilities = data.responsibilities || [];
    applySnapshot(data.users, normalized, responsibilities);
    if (data.serverTime) {
      const t = new Date(data.serverTime);
      if (!Number.isNaN(t.getTime())) nowRef.current = t;
    }
    // Phase 1 offline cache: persist every successful bootstrap so the app
    // can boot from cache when offline. Fire-and-forget — never throws.
    void persistBootstrap({
      users: data.users,
      db: normalized,
      responsibilities,
      ...(data.serverTime ? { serverTime: data.serverTime } : {}),
    });
  }, [applySnapshot]);

  usePushNotifications();

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const { onMessage } = useSignaling(session.id);

  // Patch link previews onto already-rendered messages as soon as the server
  // finishes fetching Open Graph metadata (fire-and-forget after send).
  useEffect(() => {
    onMessage((msg) => {
      const data = msg as unknown as {
        type?: string;
        messageId?: string;
        linkPreview?: LinkPreview;
        user?: User;
        userId?: string;
        lastSeenAt?: string;
        readDmIds?: string[];
        at?: string;
      };

      if (data.type === "profile_updated" && data.user) {
        const u = data.user;
        const users = stateRef.current.users;
        const idx = users.findIndex((x) => x.id === u.id);
        if (idx >= 0) {
          users[idx] = u;
        } else {
          users.push(u);
        }
        bump();
        return;
      }

      // Last-online indicator: when a user goes offline, capture their final
      // lastSeenAt so the UI can show an accurate "Last online X ago".
      if (data.type === "user_offline" && data.userId && data.lastSeenAt) {
        const users = stateRef.current.users;
        const idx = users.findIndex((x) => x.id === data.userId);
        if (idx >= 0 && users[idx]) {
          users[idx]!.lastSeenAt = data.lastSeenAt;
          bump();
        }
        return;
      }

      if (data.type === "dm_read") {
        if (data.readDmIds && data.readDmIds.length > 0) {
          const atIso = data.at || new Date().toISOString();
          let marked = false;
          for (const dm of stateRef.current.db.dms) {
            if (data.readDmIds.includes(dm.id) && !dm.readAt) {
              dm.readAt = atIso;
              marked = true;
            }
          }
          if (marked) bump();
        }
        return;
      }

      if (data.type !== "link_preview_ready" || !data.messageId || !data.linkPreview) return;
      const dms = stateRef.current.db.dms;
      const comm = stateRef.current.db.community;
      const dm = dms.find((m) => m.id === data.messageId);
      const cm = comm.find((m) => m.id === data.messageId);
      if (dm) {
        (dm as any).linkPreview = data.linkPreview;
      } else if (cm) {
        (cm as any).linkPreview = data.linkPreview;
      } else {
        return;
      }
      bump();
    });
  }, [onMessage, bump]);

  // Phase 1 offline cache: persist the authenticated identity for offline
  // UI boot. The httpOnly session cookie remains the sole server auth
  // mechanism — this is display identity only.
  useEffect(() => {
    void persistSessionIdentity(session);
  }, [session]);

  // Advertise the per-session RSC cache key to the service worker so the
  // SW can cache (and later serve offline) flight responses for this
  // session only — never another user's session on this device.
  useEffect(() => {
    void syncRscCacheSession(session.id);
  }, [session]);

  // Phase 1 offline cache: persist the server-provided snapshot so later
  // visits can boot from IndexedDB when the network is unavailable.
  useEffect(() => {
    if (!hadInitial || !initialBootstrap) return;
    void persistBootstrap({
      users: initialBootstrap.users,
      db: normalizeDb(initialBootstrap.db),
      responsibilities: initialBootstrap.responsibilities || [],
      ...(initialBootstrap.serverTime
        ? { serverTime: initialBootstrap.serverTime }
        : {}),
    });
  }, [hadInitial, initialBootstrap]);

  // Client fetch only when the server did not already provide a snapshot.
  // Do NOT abort on unmount — Strict Mode abort was leaving ready=false forever.
  // Phase 1 offline: paint the cached snapshot first when available, then
  // refresh from the server when online. Cached data is kept on network
  // failure; the error screen only shows when there is nothing to display.
  useEffect(() => {
    if (hadInitial) return;

    let alive = true;
    (async () => {
      try {
        const cached = await loadCachedBootstrap();
        if (cached && alive) {
          stateRef.current = {
            users: cached.users,
            db: normalizeDb(cached.db),
            responsibilities: cached.responsibilities || [],
          };
          if (cached.serverTime) {
            const t = new Date(cached.serverTime);
            if (!Number.isNaN(t.getTime())) nowRef.current = t;
          }
          bump();
          setReady(true);
        }
      } catch {
        /* cache read is best-effort */
      }

      try {
        await refreshRef.current();
        if (!alive) return;
        setLoadError(null);
        setReady(true);
      } catch (err) {
        if (!alive) return;
        if (stateRef.current.users.length === 0) {
          setLoadError(
            err instanceof ApiError ? err.message : "Failed to load data",
          );
        }
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
    email: null,
    role: session.role,
    isSecretary: session.isSecretary,
    isCorps: session.isCorps,
    isIntern: false,
    isActive: true,
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

  // Web Push via the Service Worker is the SOLE OS-level notification path.
  // Polling here only synchronizes in-app state (badge / bell / toasts).
  // See Phase 1 P0 fix: never fire OS alerts from polling —
  // it duplicates SW push and is unreliable on mobile PWAs.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Phase 2 offline sync: outbox status + ordered replay. Replays use the
  // httpOnly session cookie via plain fetch — the raw token is never
  // read, stored, or logged by the queue.
  const [pendingMutations, setPendingMutations] = useState(0);
  const [failedMutations, setFailedMutations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshOutboxCounts = useCallback(() => {
    countPendingOutbox()
      .then((n) => setPendingMutations(n))
      .catch(() => {});
    countFailedOutbox()
      .then((n) => setFailedMutations(n))
      .catch(() => {});
  }, []);

  const refreshOutboxCountsRef = useRef(refreshOutboxCounts);
  refreshOutboxCountsRef.current = refreshOutboxCounts;

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncOutbox({
        onReconcile: async () => {
          try {
            await refreshRef.current();
          } catch {
            /* reconcile is best-effort; queued state stays until next refresh */
          }
        },
        onFailures: (failed) => {
          if (failed.length === 0) return;
          showToastRef.current(
            "Some changes couldn't sync",
            failed.length === 1
              ? "1 change needs attention and will stay queued."
              : `${failed.length} changes need attention and will stay queued.`,
          );
        },
      });
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      refreshOutboxCountsRef.current();
    }
  }, []);

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  const retryFailedMutations = useCallback(async () => {
    await resetFailedOutbox();
    refreshOutboxCountsRef.current();
    await syncNowRef.current();
  }, []);

  // Replay queued mutations when connectivity returns, and drain any
  // leftovers from a previous session on mount. With an empty outbox the
  // engine returns immediately without touching the network.
  useEffect(() => {
    refreshOutboxCountsRef.current();
    if (typeof window === "undefined") return;
    void syncNowRef.current();
    return startAutoSync(() => {
      void syncNowRef.current();
    });
  }, []);

  const mergeNotifications = useCallback(
    (notifications?: Notification[]) => {
      if (!notifications) return;
      const mine = notifications.filter((n) => n.userId === session.id);
      const prev = stateRef.current.db.notifications || [];
      const prevIds = new Set(prev.map((n) => n.id));
      const fresh = mine.filter((n) => !prevIds.has(n.id) && !n.read);

      const map = new Map(prev.map(n => [n.id, n]));
      for (const n of notifications) {
        map.set(n.id, n);
      }
      stateRef.current.db.notifications = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // In-app toast for genuinely new arrivals (P2/P7). One toast per batch,
      // suppressed when the user is already looking at the target route and
      // when the tab is hidden (SW push covers that case).
      if (fresh.length > 0 && typeof document !== "undefined" && document.visibilityState === "visible") {
        const latest = [...fresh].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
        try {
          const path = window.location.pathname || "";
          const target = latest.activityId
            ? `/activity/${latest.activityId}`
            : latest.type === "dm" || latest.type === "mention" || latest.type === "community" || latest.type === "broadcast" || latest.type === "announcement"
              ? "/messages"
              : null;
          const onTarget = !!target && (path === target || path.startsWith(target + "/"));
          if (!onTarget && latest.text) {
            showToastRef.current("New notification", latest.text.length > 120 ? `${latest.text.slice(0, 120)}…` : latest.text);
          }
        } catch {
          /* toast is best-effort */
        }
      }
    },
    [session.id],
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
        announcements: Announcement[];
        unreadNotifications: number;
        serverTime: string;
      }>("/api/bootstrap?mode=poll")
        .then((data) => {
          if (data.notifications) {
            mergeNotifications(data.notifications);
            bump();
          }
          if (data.announcements) {
            stateRef.current.db.announcements = data.announcements;
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
    pendingMutations,
    failedMutations,
    isSyncing,
    syncNow,
    retryFailedMutations,
    createActivity: async (input) => {
      const body = {
        ...input,
        createdBy: input.createdBy || session.id,
      };
      try {
        const res = await sendQueued<{
          activity: Activity;
          dailyLogs: DailyLog[];
          notifications: Notification[];
        }>("/api/activities", "POST", body);
        stateRef.current.db.activities.push(res.activity);
        stateRef.current.db.dailyLogs.push(...(res.dailyLogs || []));
        mergeNotifications(res.notifications);
        bump();
        return res.activity;
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        // Offline: show a temp activity now. The sync engine replays the
        // create (recording temp → server id) and a refresh swaps in the
        // authoritative copy.
        const temp = buildOfflineActivity(body);
        stateRef.current.db.activities.push(temp);
        refreshOutboxCounts();
        bump();
        return temp;
      }
    },
    respondToCollaborate: async (activityId, action) => {
      const mutateLocal = () => {
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        const col = act?.collaborators?.find(
          (c) => c.userId === session.id,
        );
        if (col) {
          col.status = action === "accept" ? "accepted" : "declined";
          col.respondedAt = new Date().toISOString();
        }
      };
      try {
        const res = await sendQueued<{
          activity: Activity;
          notification?: Notification | null;
        }>(`/api/activities/${activityId}/collaborate`, "POST", { action });
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        if (res.notification) {
          stateRef.current.db.notifications.push(res.notification);
        }
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        mutateLocal();
        refreshOutboxCounts();
        bump();
      }
    },
    submitDailyLog: async (activityId, date, data) => {
      try {
        const res = await sendQueued<{
          log: DailyLog;
          activity: Activity;
          notifications: Notification[];
        }>(`/api/activities/${activityId}/logs`, "POST", { date, ...data });
        // Collaborative activities have one log per participant per day, so
        // match on userId too — never clobber a teammate's log.
        const logIdx = stateRef.current.db.dailyLogs.findIndex(
          (l) =>
            l.activityId === activityId &&
            l.date === date &&
            (res.log.userId == null
              ? l.userId == null
              : l.userId === res.log.userId),
        );
        if (logIdx >= 0) stateRef.current.db.dailyLogs[logIdx] = res.log;
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        mergeNotifications(res.notifications);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        // Offline: merge into the local log (or stage a temp one). Temp
        // activity ids are rewritten to server ids at replay time.
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        // Collaborative logs belong to the current participant's group.
        const localUserId = act?.collaborative ? session.id : null;
        const logs = stateRef.current.db.dailyLogs;
        const logIdx = logs.findIndex(
          (l) =>
            l.activityId === activityId &&
            l.date === date &&
            (localUserId == null ? l.userId == null : l.userId === localUserId),
        );
        if (logIdx >= 0)
          logs[logIdx] = mergeOfflineDailyLog(logs[logIdx], {
            ...data,
            userId: localUserId,
          });
        else
          logs.push(
            buildOfflineDailyLog(activityId, date, {
              ...data,
              userId: localUserId,
            }),
          );
        refreshOutboxCounts();
        bump();
      }
    },
    updateActivityWrapup: async (activityId, data) => {
      try {
        const res = await sendQueued<{ activity: Activity }>(
          `/api/activities/${activityId}`,
          "PATCH",
          { action: "wrapup", ...data },
        );
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) Object.assign(act, data);
        refreshOutboxCounts();
        bump();
      }
    },
    updateActivityEndDate: async (activityId, endDate) => {
      try {
        const res = await sendQueued<{ activity: Activity }>(
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
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) act.endDate = endDate;
        refreshOutboxCounts();
        bump();
      }
    },
    updateActivityMetadata: async (activityId, data) => {
      try {
        const res = await sendQueued<{ activity: Activity }>(
          `/api/activities/${activityId}`,
          "PATCH",
          { action: "updateMetadata", ...data },
        );
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) Object.assign(act, data);
        refreshOutboxCounts();
        bump();
      }
    },
    // Server owns notifications; client no-op kept for interface stability
    pushNotification: () => {
      /* notifications are created server-side */
    },
    addComment: async (activityId, text) => {
      const temp = buildOfflineComment(activityId, session.id, text);
      stateRef.current.db.comments.push(temp);
      bump();
      try {
        const res = await sendQueued<{
          comment: Comment;
          notifications: Notification[];
        }>(
          `/api/activities/${activityId}/comments`,
          "POST",
          { text },
          { tempId: temp.id },
        );
        const idx = stateRef.current.db.comments.findIndex(
          (c) => c.id === temp.id,
        );
        if (idx >= 0) stateRef.current.db.comments[idx] = res.comment;
        else stateRef.current.db.comments.push(res.comment);
        mergeNotifications(res.notifications);
      } catch (err) {
        if (!isQueuedForSync(err)) {
          // Genuine failure — remove the optimistic copy like messages do.
          stateRef.current.db.comments = stateRef.current.db.comments.filter(
            (c) => c.id !== temp.id,
          );
          throw err;
        }
        refreshOutboxCounts();
      } finally {
        bump();
      }
    },
    markNotifRead: async (id) => {
      // Optimistic update
      for (const n of stateRef.current.db.notifications) {
        if (n.id === id && n.userId === session.id) n.read = true;
      }
      bump();

      try {
        const res = await sendQueued<{ notifications: Notification[] }>(
          "/api/notifications",
          "PATCH",
          { id },
        );
        mergeNotifications(res.notifications);
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
      }
      bump();
    },
    markNotifsRead: async (ids) => {
      if (ids.length === 0) return;
      // Optimistic update
      for (const n of stateRef.current.db.notifications) {
        if (ids.includes(n.id) && n.userId === session.id) n.read = true;
      }
      bump();

      try {
        const res = await sendQueued<{ notifications: Notification[] }>(
          "/api/notifications",
          "PATCH",
          { ids },
        );
        mergeNotifications(res.notifications);
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
      }
      bump();
    },
    markAllNotifsRead: async () => {
      // Optimistic update
      for (const n of stateRef.current.db.notifications) {
        if (n.userId === session.id) n.read = true;
      }
      bump();

      try {
        const res = await sendQueued<{ notifications: Notification[] }>(
          "/api/notifications",
          "PATCH",
          { all: true },
        );
        mergeNotifications(res.notifications);
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
      }
      bump();
    },
    markDmsRead: async (withUserId) => {
      // Optimistic: flip our own incoming messages in this convo to read.
      const nowIso = new Date().toISOString();
      for (const dm of stateRef.current.db.dms) {
        const inConvo =
          (dm.a === session.id && dm.b === withUserId) ||
          (dm.a === withUserId && dm.b === session.id);
        if (inConvo && dm.from !== session.id && !dm.readAt) {
          dm.readAt = nowIso;
        }
      }
      bump();

      try {
        const res = await sendQueued<{ dms: typeof db.dms }>(
          "/api/messages/dms/read",
          "POST",
          { withUserId },
        );
        stateRef.current.db.dms = res.dms;
      } catch (err) {
        if (isQueuedForSync(err)) {
          refreshOutboxCounts();
        }
        // Best-effort: keep the optimistic readAt; the sync engine will
        // reconcile with the server later.
      }
      bump();
    },
    updateUserProfile: async (userId, patch) => {
      const idx = stateRef.current.users.findIndex((u) => u.id === userId);
      const prev = idx >= 0 ? { ...stateRef.current.users[idx] } : undefined;
      if (idx >= 0) stateRef.current.users[idx] = { ...prev, ...patch } as User;
      bump();
      try {
        const res = await sendQueued<{ user: User }>(
          `/api/users/${userId}`,
          "PATCH",
          patch,
        );
        const i = stateRef.current.users.findIndex((u) => u.id === userId);
        if (i >= 0) stateRef.current.users[i] = res.user;
        else stateRef.current.users.push(res.user);
      } catch (err) {
        if (!isQueuedForSync(err)) {
          if (idx >= 0 && prev) stateRef.current.users[idx] = prev;
          throw err;
        }
        refreshOutboxCounts();
      } finally {
        bump();
      }
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
      const temp = buildOfflineResponsibility(input);
      stateRef.current.responsibilities.push(temp);
      bump();
      try {
        const res = await sendQueued<{ responsibility: Responsibility }>(
          "/api/responsibilities",
          "POST",
          input,
          { tempId: temp.id },
        );
        const list = stateRef.current.responsibilities;
        const i = list.findIndex((r) => r.id === temp.id);
        if (i >= 0) list[i] = res.responsibility;
        else list.push(res.responsibility);
        bump();
        return res.responsibility;
      } catch (err) {
        if (!isQueuedForSync(err)) {
          stateRef.current.responsibilities =
            stateRef.current.responsibilities.filter((r) => r.id !== temp.id);
          bump();
          throw err;
        }
        refreshOutboxCounts();
        bump();
        return temp;
      }
    },
    updateResponsibility: async (id, input) => {
      const list = stateRef.current.responsibilities;
      const i = list.findIndex((r) => r.id === id);
      const prev = i >= 0 ? { ...list[i] } : undefined;
      if (i >= 0) list[i] = { ...list[i], ...input };
      bump();
      try {
        const res = await sendQueued<{ responsibility: Responsibility }>(
          `/api/responsibilities/${id}`,
          "PATCH",
          input,
        );
        const l = stateRef.current.responsibilities;
        const j = l.findIndex((r) => r.id === id);
        if (j >= 0) l[j] = res.responsibility;
        bump();
        return res.responsibility;
      } catch (err) {
        if (!isQueuedForSync(err)) {
          if (i >= 0 && prev) {
            stateRef.current.responsibilities[i] = prev;
          }
          bump();
          throw err;
        }
        // Offline: the merged local copy stands in until sync + refresh.
        const merged = stateRef.current.responsibilities.find(
          (r) => r.id === id,
        );
        refreshOutboxCounts();
        bump();
        return merged ?? { ...input, id, isActive: prev?.isActive ?? true };
      }
    },
    sendDm: async (toId, text, attachments, replyToId) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.dms.push({
        id: tempId,
        a: session.id,
        b: toId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        readAt: toId === session.id ? new Date().toISOString() : null,
        replyToId: replyToId || null,
        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.dms.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,
      });
      bump();
      try {
        const res = await sendQueued<{
          dms: typeof db.dms;
          notifications: Notification[];
        }>("/api/messages/dms", "POST", { toId, text, attachments, replyToId: replyToId || null }, { tempId });
        stateRef.current.db.dms = res.dms;
        mergeNotifications(res.notifications);
      } catch (err) {
        if (isQueuedForSync(err)) {
          // Offline: keep the optimistic message queued for sync.
          refreshOutboxCounts();
          return;
        }
        // The message never reached anyone — remove the optimistic copy so the
        // thread doesn't show a message that failed to send.
        stateRef.current.db.dms = stateRef.current.db.dms.filter((m) => m.id !== tempId);
        throw err;
      } finally {
        bump();
      }
    },
    sendCommunity: async (text, attachments, mentions, replyToId) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.community.push({
        id: tempId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: replyToId || null,
        mentions: (mentions || []).map(m => ({
          userId: m.userId,
          position: m.position,
          length: m.length,
          displayName: userMap[m.userId]?.name || "Unknown",
        })),
        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.community.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,
      });
      bump();
      try {
        const res = await sendQueued<{ community: typeof db.community }>(
          "/api/messages/community",
          "POST",
          { text, attachments, mentions, replyToId: replyToId || null },
          { tempId },
        );
        stateRef.current.db.community = res.community;
      } catch (err) {
        if (isQueuedForSync(err)) {
          // Offline: keep the optimistic message queued for sync.
          refreshOutboxCounts();
          return;
        }
        // The message never reached anyone — remove the optimistic copy so the
        // thread doesn't show a message that failed to send.
        stateRef.current.db.community = stateRef.current.db.community.filter((m) => m.id !== tempId);
        throw err;
      } finally {
        bump();
      }
    },
    recordCall: async (partnerId, durationSec) => {
      try {
        const res = await sendQueued<{ calls: typeof db.calls }>(
          "/api/messages/calls",
          "POST",
          { toId: partnerId, durationSec },
        );
        stateRef.current.db.calls = res.calls;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        // Offline: no local change needed (callers already swallow
        // errors); the record syncs on reconnect.
        refreshOutboxCounts();
      }
    },
    wipeCommunity: async () => {
      try {
        const res = await sendQueued<{ community: typeof db.community }>(
          "/api/messages/community",
          "DELETE",
        );
        stateRef.current.db.community = res.community;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        stateRef.current.db.community = [];
        refreshOutboxCounts();
        bump();
      }
    },
    deleteDmMessage: async (messageId, forEveryone) => {
      if (forEveryone) {
        const msg = stateRef.current.db.dms.find(m => m.id === messageId);
        if (msg) msg.isDeleted = true;
      } else {
        stateRef.current.db.dms = stateRef.current.db.dms.filter(m => m.id !== messageId);
      }
      bump();
      // Deleting a message that was itself created offline: drop its
      // queued create — there is nothing on the server to delete.
      if (isTempId(messageId)) {
        await removeOutboxByTempId(messageId);
        refreshOutboxCounts();
        bump();
        return;
      }
      try {
        const res = await sendQueued<{
          dms: typeof db.dms;
          notifications: Notification[];
        }>(`/api/messages/dms/${messageId}`, "DELETE", { forEveryone });
        stateRef.current.db.dms = res.dms;
        mergeNotifications(res.notifications);
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
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
      // Deleting a message that was itself created offline: drop its
      // queued create — there is nothing on the server to delete.
      if (isTempId(messageId)) {
        await removeOutboxByTempId(messageId);
        refreshOutboxCounts();
        bump();
        return;
      }
      try {
        const res = await sendQueued<{ community: typeof db.community }>(
          `/api/messages/community/${messageId}`,
          "DELETE",
          { forEveryone },
        );
        stateRef.current.db.community = res.community;
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
      } finally {
        bump();
      }
    },
    sendBroadcast: async (text) => {
      const temp = buildOfflineBroadcast(session.id, text);
      try {
        const res = await sendQueued<{
          broadcasts: typeof db.broadcasts;
          notifications: Notification[];
        }>(
          "/api/messages/broadcasts",
          "POST",
          { text },
          { tempId: temp.id },
        );
        stateRef.current.db.broadcasts = res.broadcasts;
        mergeNotifications(res.notifications);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        stateRef.current.db.broadcasts = [
          ...(stateRef.current.db.broadcasts || []),
          temp,
        ];
        refreshOutboxCounts();
        bump();
      }
    },
    sendAnnouncement: async (text) => {
      const temp = buildOfflineAnnouncement(session.id, text);
      try {
        const res = await sendQueued<{
          announcements: typeof db.announcements;
          notifications: Notification[];
        }>(
          "/api/messages/announcements",
          "POST",
          { text },
          { tempId: temp.id },
        );
        stateRef.current.db.announcements = res.announcements;
        mergeNotifications(res.notifications);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        stateRef.current.db.announcements = [
          ...(stateRef.current.db.announcements || []),
          temp,
        ];
        refreshOutboxCounts();
        bump();
      }
    },
    deleteAnnouncement: async (announcementId) => {
      stateRef.current.db.announcements = stateRef.current.db.announcements.filter(
        (a) => a.id !== announcementId,
      );
      bump();
      // Deleting an announcement that was itself created offline: drop
      // its queued create — there is nothing on the server to delete.
      if (isTempId(announcementId)) {
        await removeOutboxByTempId(announcementId);
        refreshOutboxCounts();
        bump();
        return;
      }
      try {
        const res = await sendQueued<{ announcements: typeof db.announcements }>(
          `/api/messages/announcements/${announcementId}`,
          "DELETE",
        );
        stateRef.current.db.announcements = res.announcements;
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        refreshOutboxCounts();
      } finally {
        bump();
      }
    },
    reactToAnnouncement: async (announcementId, emoji) => {
      const list = stateRef.current.db.announcements;
      const idx = list.findIndex((a) => a.id === announcementId);
      const existing = idx >= 0 ? (list[idx].reactions as AnnouncementReaction[]) : [];
      const cur = existing.find((r) => r.emoji === emoji && r.reactedByMe);
      const next =
        idx < 0
          ? existing
          : cur
            ? existing
                .map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count - 1,
                        reactors: r.reactors.filter((id) => id !== session.id),
                        reactedByMe: false,
                      }
                    : r,
                )
                .filter((r) => r.count > 0)
            : existing.find((r) => r.emoji === emoji)
              ? existing
                  .map((r) =>
                    r.emoji === emoji
                      ? {
                          ...r,
                          count: r.count + 1,
                          reactors: [...r.reactors, session.id],
                          reactedByMe: true,
                        }
                      : r,
                  )
                  .sort((a, b) => a.emoji.localeCompare(b.emoji))
              : [...existing, { emoji, count: 1, reactors: [session.id], reactedByMe: true }]
                  .sort((a, b) => a.emoji.localeCompare(b.emoji));
      if (idx >= 0) list[idx] = { ...list[idx], reactions: next };
      bump();
      try {
        const res = await sendQueued<{ announcement: Announcement }>(
          `/api/messages/announcements/${announcementId}/reactions`,
          "POST",
          { emoji },
        );
        const i = stateRef.current.db.announcements.findIndex(
          (a) => a.id === announcementId,
        );
        if (i >= 0) stateRef.current.db.announcements[i] = res.announcement;
      } catch (err) {
        if (isQueuedForSync(err)) {
          // Offline: keep the optimistic toggle queued for sync.
          refreshOutboxCounts();
        } else {
          // Optimistic toggle was wrong — revert by refetching the whole list.
          try {
            const fresh = await apiGet<{ announcements: Announcement[] }>(
              "/api/messages/announcements",
            );
            stateRef.current.db.announcements = fresh.announcements;
          } catch {
            /* best-effort revert */
          }
        }
      } finally {
        bump();
      }
    },
    addRsvpAttendee: async (logId, attendee) => {
      try {
        await sendQueued("/api/rsvp", "POST", {
          logId,
          name: attendee.name,
          phone: attendee.phone,
          email: attendee.email,
        });
        await refresh();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        // Offline: append the attendee locally; the sync engine replays
        // the RSVP and a refresh reconciles server-side.
        const idx = stateRef.current.db.dailyLogs.findIndex(
          (l) => l.id === logId,
        );
        if (idx >= 0) {
          const log = stateRef.current.db.dailyLogs[idx];
          stateRef.current.db.dailyLogs[idx] = {
            ...log,
            attendees: [...(log.attendees || []), buildOfflineAttendee(attendee)],
          };
        }
        refreshOutboxCounts();
        bump();
      }
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
      try {
        await sendQueued(`/api/activities/${activityId}`, "PATCH", {
          action: "toggleHidden",
        });
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.hidden = !act.hidden;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.hidden = !act.hidden;
        refreshOutboxCounts();
        bump();
      }
    },
    softDeleteActivity: async (activityId) => {
      try {
        await sendQueued(`/api/activities/${activityId}`, "PATCH", {
          action: "softDelete",
        });
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.softDeletedAt = new Date().toISOString();
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.softDeletedAt = new Date().toISOString();
        refreshOutboxCounts();
        bump();
      }
    },
    deleteActivity: async (activityId) => {
      try {
        await sendQueued(`/api/activities/${activityId}`, "PATCH", {
          action: "softDelete",
        });
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.softDeletedAt = new Date().toISOString();
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find((a) => a.id === activityId);
        if (act) act.softDeletedAt = new Date().toISOString();
        refreshOutboxCounts();
        bump();
      }
    },
    deactivateResponsibility: async (id) => {
      try {
        await sendQueued(`/api/responsibilities/${id}`, "PATCH", {
          action: "toggleActive",
        });
        const r = stateRef.current.responsibilities.find((x) => x.id === id);
        if (r) r.isActive = !r.isActive;
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const r = stateRef.current.responsibilities.find((x) => x.id === id);
        if (r) r.isActive = !r.isActive;
        refreshOutboxCounts();
        bump();
      }
    },
    requestException: async (activityId, explanation) => {
      try {
        const res = await sendQueued<{
          activity: Activity;
          notification: Notification;
        }>(`/api/activities/${activityId}`, "PATCH", {
          action: "requestException",
          explanation,
        });
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        mergeNotifications([res.notification]);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) {
          act.exceptionStatus = "requested";
          act.exceptionReason = explanation;
        }
        refreshOutboxCounts();
        bump();
      }
    },
    approveException: async (activityId) => {
      try {
        const res = await sendQueued<{
          activity: Activity;
          notificationToMember: Notification;
          notificationToHead: Notification;
        }>(`/api/activities/${activityId}`, "PATCH", {
          action: "approveException",
        });
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        mergeNotifications([res.notificationToMember, res.notificationToHead]);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) act.exceptionStatus = "approved";
        refreshOutboxCounts();
        bump();
      }
    },
    rejectException: async (activityId) => {
      try {
        const res = await sendQueued<{
          activity: Activity;
          notificationToMember: Notification;
        }>(`/api/activities/${activityId}`, "PATCH", {
          action: "rejectException",
        });
        const actIdx = stateRef.current.db.activities.findIndex(
          (a) => a.id === activityId,
        );
        if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
        mergeNotifications([res.notificationToMember]);
        bump();
      } catch (err) {
        if (!isQueuedForSync(err)) throw err;
        const act = stateRef.current.db.activities.find(
          (a) => a.id === activityId,
        );
        if (act) act.exceptionStatus = "rejected";
        refreshOutboxCounts();
        bump();
      }
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
        className="flex min-h-screen items-center justify-center bg-paper text-ink-soft dark:bg-aztec"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <TrakLoader />
          </div>
          <div className="text-sm font-medium text-ink-soft dark:text-[#ffffff]">Syncing with server</div>
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
