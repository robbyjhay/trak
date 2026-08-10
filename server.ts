import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

interface WsClient {
  ws: WebSocket;
  userId: string;
}

const clients = new Map<string, WsClient>();

function broadcast(data: object, excludeId?: string) {
  const msg = JSON.stringify(data);
  for (const [uid, c] of clients) {
    if (uid !== excludeId && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  }
}

function sendTo(userId: string, data: object) {
  const c = clients.get(userId);
  if (c && c.ws.readyState === WebSocket.OPEN) {
    c.ws.send(JSON.stringify(data));
  }
}

function getOnlineUsers(): string[] {
  return [...clients.keys()];
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

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let userId: string | null = null;

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "register") {
        userId = msg.userId;
        if (!userId) return;
        clients.set(userId, { ws, userId });
        console.log(`[WS] ${userId} connected (${clients.size} online)`);
        sendTo(userId, {
          type: "online_users",
          users: getOnlineUsers(),
        });
        broadcast({ type: "user_online", userId }, userId);
        return;
      }

      if (!userId) return;

      switch (msg.type) {
        case "call_offer":
          sendTo(msg.to, {
            type: "call_offer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

        case "call_answer":
          sendTo(msg.to, {
            type: "call_answer",
            from: userId,
            sdp: msg.sdp,
          });
          break;

        case "ice_candidate":
          sendTo(msg.to, {
            type: "ice_candidate",
            from: userId,
            candidate: msg.candidate,
          });
          break;

        case "call_accept":
          sendTo(msg.to, {
            type: "call_accept",
            from: userId,
          });
          break;

        case "call_reject":
          sendTo(msg.to, {
            type: "call_reject",
            from: userId,
          });
          break;

        case "call_end":
          sendTo(msg.to, {
            type: "call_end",
            from: userId,
          });
          break;

        case "ping":
          sendTo(userId, { type: "pong" });
          break;
      }
    });

    ws.on("close", () => {
      if (userId) {
        clients.delete(userId);
        console.log(`[WS] ${userId} disconnected (${clients.size} online)`);
        broadcast({ type: "user_offline", userId });
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
});
