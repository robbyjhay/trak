# Evidence Index

This index maps major claims made throughout the TRAK documentation archive directly to their supporting evidence within the repository.

### Database Architecture
**Claim**: PostgreSQL replaced the prototype JSON database.
* **Evidence (Historical)**: `Audit files/AUDIT_01_ISSUES_AND_FINDINGS.txt` (Finding A01)
* **Evidence (Current)**: `prisma/schema.prisma`, `package.json` dependencies
* **Status**: Verified

### Authentication Security
**Claim**: The application utilizes an Opaque Session Token architecture, not JWTs.
* **Evidence (Current)**: `src/lib/auth/session.ts`, `src/lib/services/auth.service.ts` (specifically `generateOpaqueToken()` and `hashToken()`)
* **Status**: Verified

### Password Security
**Claim**: Passwords are cryptographically hashed and the prototype default password was removed.
* **Evidence (Current)**: `src/lib/auth/password.ts` (`bcryptjs`, `hashPassword`, `getDevSeedPassword`)
* **Status**: Verified

### Data Privacy / API Scoping
**Claim**: The bootstrap API endpoint is strictly scoped and no longer dumps the entire database to the client.
* **Evidence (Historical)**: `Audit files/AUDIT_01_ISSUES_AND_FINDINGS.txt` (Finding A05)
* **Evidence (Current)**: `src/app/api/bootstrap/route.ts` (Utilization of `getScopedBootstrap(session)`)
* **Status**: Verified

### Realtime Infrastructure
**Claim**: The application utilizes a custom WebSocket server with Redis Pub/Sub scaling capabilities.
* **Evidence (Current)**: `server.ts` (Utilization of `ws` and `ioredis`)
* **Status**: Verified

### Environment Safety
**Claim**: The application refuses to boot in production if insecure dev passwords or settings are active.
* **Evidence (Current)**: `scripts/check-prod-env.mjs` (Process exit logic)
* **Status**: Verified

### Production Seeding
**Claim**: The database seed script blocks the creation of demo users in production.
* **Evidence (Current)**: `prisma/seed.ts` (Fail-closed logic relying on `process.env.NODE_ENV`)
* **Status**: Verified

### Unit Testing
**Claim**: 90/90 Unit tests pass.
* **Evidence (Historical)**: Documented claims in earlier project notes.
* **Evidence (Current)**: `src/__tests__/` directory and verified local execution (`task-217` Vitest logs).
* **Status**: Verified

### End-to-End Testing
**Claim**: 35/35 Playwright E2E tests pass.
* **Evidence (Historical)**: Documented claims in earlier project notes.
* **Evidence (Current)**: `e2e/` directory contains test specifications. Execution was not run against staging during documentation phase.
* **Status**: Unverified historical metric (Tests exist, execution unverified)

### User Interface Redesign
**Claim**: The application is migrating from hardcoded colors to semantic design tokens.
* **Evidence (Current)**: `src/app/globals.css` (CSS variables for `.light` and `.dark`), `tailwind.config.ts`, and the uncommitted working tree on the `sync-main` branch.
* **Status**: Verified (In Progress)
