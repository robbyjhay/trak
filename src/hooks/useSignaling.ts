"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IncomingMessage, OutgoingMessage } from "@/lib/signaling-types";
import { callDebug } from "@/lib/callDebug";

type MessageHandler = (msg: IncomingMessage) => void;

let globalWs: WebSocket | null = null;
const globalHandlers: Set<MessageHandler> = new Set();
/** React-state subscribers notified whenever the socket opens/closes. */
const connectionSubscribers: Set<() => void> = new Set();
let globalOnlineUsers: Set<string> = new Set();
let globalConnected = false;
let globalPresenceSynced = false;
/** Stop reconnect loops after auth rejection (no valid session cookie). */
let authRejected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;
/** True while a call is in progress (set via setSignalingCallActive). */
let callActive = false;
/** Timestamp of the last "pong" seen from the server (0 = none yet). */
let lastPongAt = 0;
/** Number of reconnect attempts triggered by a 4000 (replaced) close. */
let replaceReconnectAttempts = 0;

/** Client → server heartbeat interval in ms. Must be < server TTL (60 s). */
const PING_INTERVAL_MS = 30_000;
/** How often the dead-socket watchdog ticks (ms). */
const HEARTBEAT_CHECK_MS = 10_000;
/** Tolerate ~1 lost ping/pong cycle before declaring a socket half-open. */
const HEARTBEAT_TIMEOUT_MS = 45_000;
/** How long queued call messages survive before being dropped as stale. */
const PENDING_TTL_MS = 10_000;
/** Upper bound for the outbound queue (protects memory on flaky links). */
const PENDING_QUEUE_MAX = 50;
/** Bounded reconnects after a 4000 "replaced" close during an active call. */
const MAX_REPLACE_RECONNECTS = 3;

/**
 * Only these messages are mission-critical for call recovery. Regular app
 * messages (presence, DMs, read receipts) are NOT queued — if the socket is
 * down they are dropped exactly as before.
 */
const CALL_MESSAGE_TYPES = new Set<string>([
  "call_offer",
  "call_answer",
  "ice_candidate",
  "ice_restart_offer",
  "ice_restart_answer",
  "call_reject",
  "call_end",
]);

interface PendingSend {
  msg: OutgoingMessage;
  at: number;
}

let pendingSendQueue: PendingSend[] = [];

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const portStr = window.location.port ? `:${window.location.port}` : "";
  return `${proto}//${window.location.hostname}${portStr}/ws`;
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function notifyConnectionChange() {
  for (const cb of connectionSubscribers) {
    try {
      cb();
    } catch {
      /* subscriber errors must not break the socket loop */
    }
  }
}

/**
 * Replay any call messages that were queued while the socket was down.
 * Stale entries (older than PENDING_TTL_MS) are dropped. Successful sends are
 * removed from the queue so a message is delivered at most once.
 */
function flushPendingQueue() {
  const ws = globalWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (pendingSendQueue.length === 0) return;
  const now = Date.now();
  const undelivered: PendingSend[] = [];
  for (const entry of pendingSendQueue) {
    if (now - entry.at > PENDING_TTL_MS) continue; // expired — safe to drop
    try {
      ws.send(JSON.stringify(entry.msg));
    } catch {
      // Send failed (socket raced to CLOSING) — try again on the next open.
      undelivered.push(entry);
    }
  }
  if (undelivered.length > 0) {
    callDebug("[signaling] flushed call queue; some remain undelivered", undelivered.length);
  }
  pendingSendQueue = undelivered;
  notifyConnectionChange();
}

function enqueueIfCallMessage(msg: OutgoingMessage) {
  if (!CALL_MESSAGE_TYPES.has(msg.type)) return;
  // Drop duplicates still sitting in the queue so we never deliver twice.
  const key = JSON.stringify(msg);
  if (pendingSendQueue.some((e) => JSON.stringify(e.msg) === key)) return;
  while (pendingSendQueue.length >= PENDING_QUEUE_MAX) {
    pendingSendQueue.shift();
  }
  pendingSendQueue.push({ msg, at: Date.now() });
  callDebug("[signaling] queued call message for reconnect", msg.type);
}

/**
 * Called by CallProvider whenever a call starts/ends. While a call is active
 * the 4000 "replaced" close is allowed to reconnect so signaling is not lost;
 * when the call ends, buffered non-terminal call messages are discarded so a
 * finished call is never resurrected by the replay.
 */
export function setSignalingCallActive(active: boolean) {
  callActive = active;
  if (!active) {
    pendingSendQueue = pendingSendQueue.filter(
      (e) => e.msg.type === "call_reject" || e.msg.type === "call_end",
    );
    callDebug("[signaling] call inactive — dropped stale queued messages");
  }
}

function startPingTimer() {
  clearPingTimer();
  let msSincePing = 0;
  pingTimer = setInterval(() => {
    msSincePing += HEARTBEAT_CHECK_MS;
    const ws = globalWs;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      msSincePing = 0;
      return;
    }

    // Send an application-level ping on the normal cadence.
    if (msSincePing >= PING_INTERVAL_MS) {
      msSincePing = 0;
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        /* socket closing mid-tick — ignore */
      }
    }

    // Half-open (or dead) detection: if we previously observed a pong but have
    // not for longer than the heartbeat timeout, force-close the socket so the
    // reconnect path kicks in. Healthy sockets (pongs every ~30s) are untouched.
    if (lastPongAt > 0 && Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) {
      lastPongAt = 0;
      callDebug("[signaling] heartbeat timeout — closing stale socket");
      try {
        ws.close(4001, "Heartbeat timeout");
      } catch {
        /* ignore */
      }
    }
  }, HEARTBEAT_CHECK_MS);
}

function ensureConnection(userId: string) {
  if (authRejected) return;
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return;
  if (globalWs && globalWs.readyState === WebSocket.CONNECTING) return;
  currentUserId = userId;

  const ws = new WebSocket(getWsUrl());
  globalWs = ws;

  ws.onopen = () => {
    globalConnected = true;
    globalPresenceSynced = false;
    replaceReconnectAttempts = 0;
    lastPongAt = Date.now();
    callDebug("[signaling] connected");
    // Handshake only — server ignores userId and uses session cookie.
    ws.send(JSON.stringify({ type: "register", userId }));
    startPingTimer();
    flushPendingQueue();
    notifyConnectionChange();
  };

  ws.onmessage = (e) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    if (msg.type === "error" && msg.code === "unauthorized") {
      authRejected = true;
      clearReconnectTimer();
      clearPingTimer();
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }

    if (msg.type === "pong") {
      lastPongAt = Date.now();
    } else if (msg.type === "online_users") {
      globalOnlineUsers = new Set(msg.users);
      globalPresenceSynced = true;
    } else if (msg.type === "user_online") {
      globalOnlineUsers.add(msg.userId);
    } else if (msg.type === "user_offline") {
      globalOnlineUsers.delete(msg.userId);
    }

    for (const h of globalHandlers) {
      h(msg);
    }
  };

  ws.onclose = (ev) => {
    globalConnected = false;
    globalPresenceSynced = false;
    globalWs = null;
    clearPingTimer();
    lastPongAt = 0;
    // Surface the disconnect to React so the UI can switch to "Reconnecting…".
    notifyConnectionChange();
    // 4401 = unauthorized (custom); do not spin reconnect without a session.
    if (authRejected || ev.code === 4401) {
      authRejected = true;
      return;
    }
    // 4000 = replaced by a newer connection from another tab/device.
    // Normally do not reconnect — the newer connection owns presence. During
    // an active call we reconnect (bounded) so offer/answer/ICE are not lost.
    if (ev.code === 4000) {
      if (!callActive) {
        callDebug("[signaling] replaced by newer connection — not reconnecting");
        return;
      }
      callDebug("[signaling] replaced during active call — reconnecting");
      if (replaceReconnectAttempts >= MAX_REPLACE_RECONNECTS) {
        callDebug("[signaling] replace reconnect attempts exhausted");
        return;
      }
      replaceReconnectAttempts += 1;
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => ensureConnection(currentUserId || ""), 1000);
      return;
    }
    callDebug("[signaling] disconnected", ev.code, ev.reason);
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => ensureConnection(currentUserId || ""), 2000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

export function useSignaling(userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
    globalOnlineUsers,
  );
  const [connected, setConnected] = useState(globalConnected);
  const [presenceSynced, setPresenceSynced] = useState(globalPresenceSynced);
  const handlerRef = useRef<MessageHandler | null>(null);

  useEffect(() => {
    // New mount with a user id after login — allow reconnect attempts again.
    if (userId) {
      authRejected = false;
    }
    ensureConnection(userId);

    const handler: MessageHandler = (msg) => {
      if (msg.type === "online_users") {
        setOnlineUsers(new Set(msg.users));
        setPresenceSynced(true);
      } else if (msg.type === "user_online") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(msg.userId);
          return next;
        });
      } else if (msg.type === "user_offline") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(msg.userId);
          return next;
        });
      }
      setConnected(globalConnected);
      setPresenceSynced(globalPresenceSynced);
      handlerRef.current?.(msg);
    };

    globalHandlers.add(handler);

    // Keep React state in sync with module-level connection changes (close,
    // open, queue flush) even when no message arrives.
    const syncConnectionState = () => {
      setConnected(globalConnected);
      setPresenceSynced(globalPresenceSynced);
    };
    syncConnectionState();
    connectionSubscribers.add(syncConnectionState);

    return () => {
      globalHandlers.delete(handler);
      connectionSubscribers.delete(syncConnectionState);
    };
  }, [userId]);

  const send = useCallback((msg: OutgoingMessage) => {
    if (authRejected) return;
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      try {
        globalWs.send(JSON.stringify(msg));
        return;
      } catch {
        // Socket raced to CLOSING mid-send — fall through to the queue.
      }
    }
    // Socket unavailable: buffer critical call messages for replay on reconnect.
    enqueueIfCallMessage(msg);
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlerRef.current = handler;
  }, []);

  return { onlineUsers, connected, presenceSynced, send, onMessage };
}