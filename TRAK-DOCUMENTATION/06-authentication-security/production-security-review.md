# Production Security Review: Authentication & Sessions

This document details the actual authentication architecture currently implemented in TRAK, contrasting it against the historical state found during the production audit.

## Historical Authentication
Before the `120ac62` hardening commit, the application relied on a heavily mocked authentication architecture:
* All seeded accounts utilized a shared plaintext password (`DLUactsys360`), which was printed to the server console upon initialization.
* The session mechanism utilized JSON Web Tokens (JWT) but relied on a hardcoded, unsecure fallback secret (`trak-dev-secret-change-me-in-production-32b`).
* Role-based access control was loosely enforced on the client side rather than strictly gated by server middleware.

## Current Authentication Architecture (Phase 0+)
The audit explicitly identified the JWT fallback and shared passwords as Critical Blockers (A03, A04). The current repository reflects a massive remediation of these issues.

### 1. Opaque Session Tokens (Not JWT)
Contrary to earlier prototype documentation, TRAK **does not currently use JWTs for sessions**. It utilizes an **Opaque Session Token** architecture:
* When a user logs in, `generateOpaqueToken()` uses `node:crypto` (`randomBytes(32).toString("base64url")`) to create a secure, random string.
* The **raw token** is sent to the client and stored in an `HttpOnly`, `Secure` cookie (`trak_session`).
* The **database** stores only a SHA-256 hash of this token (`hashToken(raw)`) in the `Session` model.
* **Why it matters**: This prevents an attacker who gains read access to the database from hijacking active user sessions, as they only possess the hash, not the cookie value.

### 2. Edge Middleware & DB Validation
The validation is split into two tiers for performance:
* **Edge Proxy (`src/proxy.ts`)**: The edge middleware acts as a high-speed gate. It only checks for the *presence* of the `trak_session` cookie and enforces an explicit allowlist of public routes (`/login`, `/rsvp`). It does not validate the token cryptographically.
* **Full Validation**: Actual route handlers and Server Actions call `requireSession()`, which queries the PostgreSQL database via Prisma to validate the SHA-256 hash against the `Session` table, ensuring the session has not been revoked or expired.

### 3. Password Security
* **Hashing**: `src/lib/auth/password.ts` confirms passwords are hashed using `bcryptjs` with a cost factor of 12. Plaintext passwords are never logged or stored.
* **Removal of Shared Defaults**: The `DLUactsys360` shared password was eradicated. `generateTemporaryPassword()` now creates cryptographically secure 18-byte random strings for new accounts.
* **Dev Seed Constraints**: The seed script (`prisma/seed.ts`) explicitly refuses to run with dev seeds if `NODE_ENV=production`. If `ENABLE_DEV_LOGIN` is active locally, it uses a non-shared default (`TrakDevPass123!`), but strictly blocks this configuration in production.

## Conclusion
The application has successfully migrated from a highly insecure prototype state to a robust, opaque-token session architecture that meets production security requirements.
