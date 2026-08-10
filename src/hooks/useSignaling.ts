"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IncomingMessage, OutgoingMessage } from "@/lib/signaling-types";

type MessageHandler = (msg: IncomingMessage) => void;

let globalWs: WebSocket | null = null;
const globalHandlers: Set<MessageHandler> = new Set();
let globalOnlineUsers: Set<string> = new Set();
let globalConnected = false;

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:${window.location.port}/ws`;
}

function ensureConnection(userId: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return;

  const ws = new WebSocket(getWsUrl());
  globalWs = ws;

  ws.onopen = () => {
    globalConnected = true;
    ws.send(JSON.stringify({ type: "register", userId }));
  };

  ws.onmessage = (e) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
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

  ws.onclose = () => {
    globalConnected = false;
    globalWs = null;
    setTimeout(() => ensureConnection(userId), 2000);
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
