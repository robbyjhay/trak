# Realtime Production Readiness

This document verifies the production readiness of TRAK's realtime communication infrastructure.

## Historical State
The original iteration of the application relied on a 30-second polling mechanism to simulate real-time updates. The client repeatedly hit the `GET /api/bootstrap` endpoint.
* **Risk**: This architecture generates immense, unnecessary server load and introduces significant latency to chat delivery.

## Current Realtime Architecture
The application now utilizes a dedicated WebSocket server (`server.ts`) running alongside Next.js.

### 1. Multi-Node Scalability (Redis)
The WebSocket implementation is explicitly engineered for production scale.
* By default, it operates in a single-node memory mode.
* When `TRAK_RUNTIME_MODE="multi"`, the server requires a `REDIS_URL`.
* It utilizes `ioredis` to establish `pubClient`, `subClient`, and a general `redisClient`. This allows WebSockets connected to Server A to instantly broadcast messages to WebSockets connected to Server B via Redis Pub/Sub channels.
* Online presence is tracked globally using Redis Sorted Sets (`zadd "trak:ws:online"`).

### 2. Authentication
WebSocket connections are securely authenticated. 
* During the HTTP Upgrade request, `server.ts` parses the `trak_session` cookie and queries the PostgreSQL database (via Prisma) to validate the session token hash *before* allowing the TCP connection to upgrade to a WebSocket.

### 3. Signaling (WebRTC)
The WebSocket server acts as the secure signaling channel for the `CallPanel.tsx` peer-to-peer WebRTC implementation. It routes `call_offer`, `call_answer`, and `ice_candidate` events specifically to the targeted user's active socket.

## Conclusion
The realtime architecture represents a massive maturity upgrade from the initial polling prototype. It is fully authenticated and explicitly designed to support horizontal scaling via Redis, meeting stringent production engineering requirements.
