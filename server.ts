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
}

app.prepare().then(() => {
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
        case "call_offer":
          sendTo(msg.to as string, {
            type: "call_offer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

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
          break;

        case "call_reject":
          sendTo(msg.to as string, {
            type: "call_reject",
            from: userId,
          });
          break;

        case "call_end":
          sendTo(msg.to as string, {
            type: "call_end",
            from: userId,
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
