// Bypass server-only error when running via raw tsx
const _Module = require("module");
try {
  _Module._cache[require.resolve("server-only")] = { exports: {} };
} catch (e) {}

import { createServer, type IncomingMessage } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { getSessionUserIdFromCookieHeader } from "./src/lib/auth/ws-session";


import Redis from "ioredis";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const PORT = parseInt(process.env.PORT || "3000", 10);
const isMulti = process.env.TRAK_RUNTIME_MODE === "multi";

let prisma: any;
let sendPushNotification: any;

const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

interface WsClient {
  ws: WebSocket;
  userId: string;
}

const clients = new Map<string, WsClient>();

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let redisClient: Redis | null = null;

if (isMulti) {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error("[server] REDIS_URL is required when TRAK_RUNTIME_MODE=multi");
    process.exit(1);
  }
  pubClient = new Redis(url);
  subClient = new Redis(url);
  redisClient = new Redis(url);

  subClient.subscribe("trak:ws:sendTo", "trak:ws:broadcast", (err) => {
    if (err) console.error("[server] Redis subscribe error:", err);
  });

  subClient.on("message", (channel, message) => {
    try {
      if (channel === "trak:ws:sendTo") {
        const { userId, data } = JSON.parse(message);
        const c = clients.get(userId);
        if (c && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(data));
        }
      } else if (channel === "trak:ws:broadcast") {
        const { data, excludeId } = JSON.parse(message);
        const msgStr = JSON.stringify(data);
        for (const [uid, c] of clients) {
          if (uid !== excludeId && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(msgStr);
          }
        }
      }
    } catch (e) {
      console.error("[server] Redis message parse error:", e);
    }
  });

  // Periodically prune stale presence records
  setInterval(() => {
    const minScore = Date.now() - 60000;
    redisClient?.zremrangebyscore("trak:ws:online", "-inf", minScore).catch(() => {});
  }, 30000).unref();
}

function broadcast(data: object, excludeId?: string) {
  if (isMulti && pubClient) {
    pubClient.publish("trak:ws:broadcast", JSON.stringify({ data, excludeId })).catch(() => {});
  } else {
    const msg = JSON.stringify(data);
    for (const [uid, c] of clients) {
      if (uid !== excludeId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg);
      }
    }
  }
}

function sendTo(userId: string, data: object) {
  if (isMulti && pubClient) {
    pubClient.publish("trak:ws:sendTo", JSON.stringify({ userId, data })).catch(() => {});
  } else {
    const c = clients.get(userId);
    if (c && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify(data));
    }
  }
}

async function getOnlineUsers(): Promise<string[]> {
  if (isMulti && redisClient) {
    const minScore = Date.now() - 60000;
    return await redisClient.zrangebyscore("trak:ws:online", minScore, "+inf");
  }
  return [...clients.keys()];
}

function rejectUnauthorized(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    try {
      ws.send(
        JSON.stringify({
          type: "error",
          code: "unauthorized",
          message: "Valid session required",
        }),
      );
    } catch {
      /* ignore */
    }
    ws.close(4401, "Unauthorized");
  }
}

async function attachAuthenticatedClient(ws: WebSocket, userId: string) {
  const existing = clients.get(userId);
  if (existing && existing.ws !== ws) {
    try {
      existing.ws.close(4000, "Replaced by new connection");
    } catch {
      /* ignore */
    }
  }

  clients.set(userId, { ws, userId });
  console.log(`[WS] ${userId} connected (${clients.size} online locally)`);

  if (isMulti && redisClient) {
    await redisClient.zadd("trak:ws:online", Date.now(), userId).catch(() => {});
  }

  const online = await getOnlineUsers();
  sendTo(userId, {
    type: "online_users",
    users: online,
  });
  broadcast({ type: "user_online", userId }, userId);

  // Send any pending calls
  const expirationThreshold = new Date(Date.now() - 60000); // 60 seconds ago
  prisma.pendingCall.findMany({ where: { toUserId: userId } }).then((calls: any[]) => {
    const validCalls = calls.filter((c: any) => c.createdAt >= expirationThreshold);
    validCalls.forEach((call: any) => {
      sendTo(userId, {
        type: "call_offer",
        from: call.fromUserId,
        sdp: call.sdp,
      });
    });
    // Delete all processed or expired calls for this user
    if (calls.length > 0) {
      prisma.pendingCall.deleteMany({ where: { toUserId: userId } }).catch(console.error);
    }
  }).catch(console.error);
}

app.prepare().then(async () => {
  prisma = (await import("./src/lib/db/prisma")).prisma;
  sendPushNotification = (await import("./src/lib/pushServer")).sendPushNotification;
  const { markActivitiesMissed } = await import("./src/lib/db/service");
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url!, true);
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      app.getUpgradeHandler()(req, socket, head);
    }
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let userId: string | null = null;
    let authPending = true;

    // Authenticate from session cookie on upgrade (never trust client userId).
    void (async () => {
      try {
        const sessionUserId = await getSessionUserIdFromCookieHeader(
          req.headers.cookie,
        );
        if (!sessionUserId) {
          rejectUnauthorized(ws);
          return;
        }
        if (ws.readyState === WebSocket.CLOSED) return;
        userId = sessionUserId;
        authPending = false;
        attachAuthenticatedClient(ws, userId);
      } catch (err) {
        console.error(
          "[WS] auth failed",
          err instanceof Error ? err.message : err,
        );
        rejectUnauthorized(ws);
      }
    })();

    ws.on("message", (raw) => {
      if (authPending || !userId) return;

      let msg: { type?: string; to?: string; sdp?: unknown; candidate?: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // register is optional client handshake; identity already bound from cookie.
      if (msg.type === "register") {
        return;
      }

      switch (msg.type) {
        case "call_offer": {
          sendTo(msg.to as string, {
            type: "call_offer",
            from: userId,
            sdp: msg.sdp,
          });
          
          getOnlineUsers().then(online => {
            if (!online.includes(msg.to as string)) {
              prisma.pendingCall.create({
                data: { fromUserId: userId!, toUserId: msg.to as string, sdp: msg.sdp as any }
              }).catch(console.error);
              prisma.user.findUnique({ where: { id: userId } }).then((u: any) => {
                if (u) {
                  sendPushNotification(msg.to as string, `📞 ${u.name || u.username} is calling you`, "Open TRAK to answer the call.", { url: "/dashboard" }).catch(console.error);
                }
              });
            }
          });
          break;
        }

        case "call_answer":
          sendTo(msg.to as string, {
            type: "call_answer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

        case "ice_candidate":
          sendTo(msg.to as string, {
            type: "ice_candidate",
            from: userId,
            candidate: msg.candidate,
          });
          break;

        case "call_accept":
          sendTo(msg.to as string, {
            type: "call_accept",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: msg.to as string, toUserId: userId }
          }).catch(console.error);
          break;

        case "call_reject":
          sendTo(msg.to as string, {
            type: "call_reject",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: msg.to as string, toUserId: userId }
          }).catch(console.error);
          break;

        case "call_end":
          sendTo(msg.to as string, {
            type: "call_end",
            from: userId,
          });
          prisma.pendingCall.deleteMany({
            where: { fromUserId: userId, toUserId: msg.to as string }
          }).then(deleted => {
            if (deleted.count > 0) {
              prisma.user.findUnique({ where: { id: userId } }).then(u => {
                if (u) {
                  sendPushNotification(msg.to as string, `📞 Missed call from ${u.name || u.username}`, "Tap to return the call.", { url: "/dashboard" }).catch(console.error);
                }
              });
            }
          });
          break;

        case "ping":
          sendTo(userId, { type: "pong" });
          if (isMulti && redisClient) {
            redisClient.zadd("trak:ws:online", Date.now(), userId).catch(() => {});
          }
          break;
      }
    });

    ws.on("close", () => {
      if (userId) {
        const current = clients.get(userId);
        // Only remove if this socket still owns the slot (not replaced).
        if (current?.ws === ws) {
          clients.delete(userId);
          console.log(`[WS] ${userId} disconnected (${clients.size} online locally)`);
          if (isMulti && redisClient) {
            redisClient.zrem("trak:ws:online", userId).catch(() => {});
          }
          broadcast({ type: "user_offline", userId });
        }
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] error:", err.message);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://${hostname}:${PORT}`);
    console.log(`> WebSocket signaling on ws://${hostname}:${PORT}/ws`);
  });

  // Scheduled background job: mark overdue pending activities as missed and
  // expire any approved exception grace periods that have elapsed.
  const runMissedProcessor = async () => {
    try {
      await markActivitiesMissed(new Date());
      console.log("[scheduler] Missed-activity processor ran.");
    } catch (err) {
      console.error("[scheduler] Error running missed-activity processor:", err);
    }
  };
  runMissedProcessor();
  const missedTimer = setInterval(runMissedProcessor, 5 * 60 * 1000);
  missedTimer.unref();

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("\n[server] Shutting down gracefully...");
    
    // Stop accepting new connections
    httpServer.close((err) => {
      if (err) {
        console.error("[server] Error closing HTTP server:", err);
        process.exit(1);
      }
      console.log("[server] HTTP server closed.");
      
      // Close WebSockets
      for (const client of clients.values()) {
        try {
          client.ws.close(1001, "Server shutting down");
        } catch { /* ignore */ }
      }
      clients.clear();
      console.log("[server] WebSockets closed.");
      
      if (isMulti) {
        pubClient?.quit();
        subClient?.quit();
        redisClient?.quit();
        console.log("[server] Redis clients closed.");
      }
      
      process.exit(0);
    });

    // Fallback timeout in case keep-alive connections hang
    setTimeout(() => {
      console.error("[server] Force closing after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
