"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IncomingMessage, OutgoingMessage } from "@/lib/signaling-types";

type MessageHandler = (msg: IncomingMessage) => void;

let globalWs: WebSocket | null = null;
const globalHandlers: Set<MessageHandler> = new Set();
let globalOnlineUsers: Set<string> = new Set();
let globalConnected = false;
/** Stop reconnect loops after auth rejection (no valid session cookie). */
let authRejected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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

function ensureConnection(userId: string) {
  if (authRejected) return;
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return;
  if (globalWs && globalWs.readyState === WebSocket.CONNECTING) return;

  const ws = new WebSocket(getWsUrl());
  globalWs = ws;

  ws.onopen = () => {
    globalConnected = true;
    // Handshake only — server ignores userId and uses session cookie.
    ws.send(JSON.stringify({ type: "register", userId }));
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
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }

    if (msg.type === "online_users") {
      globalOnlineUsers = new Set(msg.users);
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
    globalWs = null;
    // 4401 = unauthorized (custom); do not spin reconnect without a session.
    if (authRejected || ev.code === 4401) {
      authRejected = true;
      return;
    }
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => ensureConnection(userId), 2000);
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
      handlerRef.current?.(msg);
    };

    globalHandlers.add(handler);

    return () => {
      globalHandlers.delete(handler);
    };
  }, [userId]);

  const send = useCallback((msg: OutgoingMessage) => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(msg));
    }
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlerRef.current = handler;
  }, []);

  return { onlineUsers, connected, send, onMessage };
}
