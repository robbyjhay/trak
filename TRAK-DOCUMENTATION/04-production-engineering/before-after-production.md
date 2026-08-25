# Before → After Production Maturity

This document contrasts the application's historical state (prototype/pre-audit) against its current verified architecture.

| Area | Historical State | Current State |
| :--- | :--- | :--- |
| **Data storage** | Local JSON file (`.data/trak-db.json`) | PostgreSQL |
| **ORM** | None (Custom JSON Mutex) | Prisma ORM |
| **Passwords** | Shared plaintext constant (`DLUactsys360`) | Hashed via `bcryptjs` (Cost 12) |
| **Auth** | Mock JWT with hardcoded fallback secret | Opaque session tokens (SHA-256 in DB) |
| **Authorization**| Weak / Client-side routing checks | Strict server-side RBAC enforcement |
| **API** | `/api/bootstrap` dumped all unit data | Scoped endpoints utilizing `getScopedBootstrap` |
| **Realtime** | 30-second HTTP polling | WebSockets powered by `ws` |
| **Scaling** | Single Node only (JSON mutex limits) | Multi-Node ready (Redis Pub/Sub integration) |
| **File storage** | Local/mock browser Blob URLs | AWS S3 via presigned URLs |
| **Tests** | Non-existent | Automated Vitest (Unit) and Playwright (E2E) |
| **Production config**| Manual assumption | Automated environment gate (`check-prod-env.mjs`) |
| **Seeding** | Accidentally seeded demo/dev users | Fail-closed catalog-only production seed |
