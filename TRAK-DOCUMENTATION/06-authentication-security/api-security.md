# API Security Review

This document examines the security posture of the major server/API endpoints in the current TRAK implementation.

## Historical Context
The initial production audit flagged `GET /api/bootstrap` as a Critical Blocker (A05) because it returned an un-scoped dump of the entire JSON database (including all direct messages and activities for all users) to any authenticated client. Furthermore, endpoints lacked rate limiting, making them vulnerable to abuse.

## Current State of API Security

### 1. The Scoped Bootstrap Endpoint
The `GET /api/bootstrap/route.ts` endpoint was completely rewritten.
* **Authentication Requirement**: Enforces `requireSession()`. Unauthenticated requests are immediately rejected.
* **Rate Limiting**: Protected by a Redis-backed sliding-window rate limit (20 requests per minute for full fetches, 60 requests for lightweight polls).
* **Data Scoping**: Crucially, it now calls `getScopedBootstrap(session)`. This service layer explicitly filters database queries so the client *only* receives Activities, Direct Messages, and Notifications that belong to their specific `session.user.id`.

### 2. Public RSVP Endpoint
* **Endpoint**: `/api/rsvp`
* **Vulnerability Fixed**: Previously, anyone could guess a `logId` and inject an attendee. It now verifies a cryptographic `rsvpTokenHash` stored on the `DailyLog` model. The submission is rejected if the token does not mathematically match the requested activity.
* **Validation**: Input is validated using strict Zod schemas before hitting the database.

### 3. File Upload Controls
* **Endpoint**: `/api/uploads/sign`
* **Mechanism**: The server generates AWS S3 presigned URLs. The client uploads directly to S3, not through the Node server.
* **Authorization**: Only authenticated sessions can request a signature.
* **Current Limitation**: While the API is secure, the actual backend implementation linking these S3 URLs to specific messages or activities appears partially complete or visually mocked in some areas (like Connect message attachments).

### 4. Rate Limiting Infrastructure
* **Implementation**: `src/lib/auth/rate-limit.ts` implements a robust sliding-window rate limiter.
* **Architecture**: It attempts to connect to Redis (`ioredis`) for multi-node scalable limiting. If `REDIS_URL` is missing, it falls back to an in-memory Map, though `check-prod-env.mjs` warns against this configuration in production.

## Conclusion
The API layer has successfully transitioned from an insecure, over-exposed prototype to a tightly scoped, rate-limited, and authenticated backend architecture.
