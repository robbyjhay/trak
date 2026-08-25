# Audit History & Production Snapshots

This document chronicles the historical production-readiness audits of TRAK, specifically focusing on the state of the application before the Phase 0 hardening work commenced (commit `120ac62`).

## Context
During development, the transition from prototype to application occurred iteratively. A formal production-readiness audit was conducted (`Audit files/AUDIT_00_EXECUTIVE_SUMMARY.txt`) to determine if the application was safe to deploy.

The audit returned a decisive verdict: **"DO NOT DEPLOY TO PRODUCTION"** with an overall maturity score of 2.5 / 10.

## Major Findings Snapshot

### 1. Data Layer Architecture
* **Historical state**: The entire database was a single, local JSON file (`.data/trak-db.json`) managed by a process-level mutex.
* **Severity**: CRITICAL (Blocker C1)
* **Evidence**: `AUDIT_01_ISSUES_AND_FINDINGS.txt` Finding A01.
* **Why it mattered**: A local JSON file cannot survive serverless deployments or multi-instance scaling. It lacks ACID transactions and would corrupt under concurrent multi-user activity.
* **Remediation**: The JSON store was permanently discarded. Replaced with PostgreSQL via Prisma ORM.
* **Verification**: Verified via `prisma/schema.prisma` provider and `package.json` dependencies.

### 2. Password Handling
* **Historical state**: All seeded and newly created users shared the exact same default password: `DLUactsys360`. Furthermore, this plaintext password was logged to the server console and returned in API responses.
* **Severity**: CRITICAL (Blocker C3 / A04)
* **Evidence**: Finding A04.
* **Why it mattered**: Trivial credential stuffing. Any user could guess any other user's password.
* **Remediation**: Passwords are now hashed using `bcryptjs` with a cost of 12. Temporary passwords are generated cryptographically (`randomBytes(18)`), and the shared prototype password was completely eradicated.
* **Verification**: Verified via `src/lib/auth/password.ts`.

### 3. API Data Leakage
* **Historical state**: The `GET /api/bootstrap` endpoint returned the *entire* JSON database, including all users' Direct Messages, notifications, and hidden activities, to any authenticated user.
* **Severity**: CRITICAL (Blocker C5 / A05)
* **Evidence**: Finding A05.
* **Why it mattered**: Severe data privacy violation. The client received a dump of all sensitive unit data.
* **Remediation**: The endpoint was rewritten. It now enforces a `getScopedBootstrap(session)` query that explicitly filters all returned arrays (activities, DMs) based on the requesting user's ID.
* **Verification**: Verified via `src/app/api/bootstrap/route.ts` and `src/lib/db/service.ts`.

### 4. JWT Fallback Vulnerability
* **Historical state**: The application used a hardcoded fallback string for signing JWTs (`trak-dev-secret-change-me-in-production-32b`).
* **Severity**: CRITICAL (Blocker C4 / A03)
* **Evidence**: Finding A03.
* **Why it mattered**: Anyone knowing the hardcoded secret could forge administrator JWTs.
* **Remediation**: The application now refuses to boot in production if `TRAK_SESSION_SECRET` is missing, short, or matches the fallback string.
* **Verification**: Verified via `scripts/check-prod-env.mjs`.

### 5. Realtime Architecture
* **Historical state**: The application simulated real-time updates via a 30-second polling mechanism to the bootstrap endpoint.
* **Severity**: MEDIUM/HIGH (Performance blocker)
* **Evidence**: Audit Executive Summary.
* **Why it mattered**: Inefficient polling creates massive unnecessary server load and delays chat delivery.
* **Remediation**: A custom WebSocket server (`server.ts`) was written, utilizing `ws` and integrating with Redis Pub/Sub (`ioredis`) for multi-node scalability.
* **Verification**: Verified via `server.ts` and `package.json`.
