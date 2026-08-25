# Professional Engineering Lessons

The development and subsequent hardening of TRAK provides several critical lessons in software engineering, specifically regarding the transition from prototype to production.

### 1. Prototype Persistence Cannot Scale
* **The Situation**: TRAK was initially built using a local `.data/trak-db.json` file to satisfy the prototype's need to "save" data.
* **The Lesson**: A process-level JSON file with a mutex completely prevents horizontal scaling. If deployed to a serverless environment (like Vercel) or a multi-instance container, the data would instantly fragment or corrupt. Prototype persistence mechanisms must be completely discarded, not patched, before production.

### 2. The Danger of "Dev" Convenience
* **The Situation**: To make local testing easier, the application shared a plaintext password (`DLUactsys360`) and a hardcoded JWT secret (`trak-dev-secret-change-me-in-production-32b`).
* **The Lesson**: If dev conveniences are left in the codebase without strict environment gating, they *will* eventually leak into production. TRAK solved this correctly by implementing `scripts/check-prod-env.mjs`, which explicitly causes the application to crash if it detects these dev strings in a production environment.

### 3. API Endpoints Must Be Defensively Scoped
* **The Situation**: The early `GET /api/bootstrap` endpoint simply dumped the entire database payload to the client so the frontend React context could sort it out.
* **The Lesson**: Client-side filtering is not security. Sending all users' direct messages to every client constitutes a massive data breach. Endpoints must be strictly scoped at the database query level (`getScopedBootstrap`), returning *only* what the authenticated user is explicitly authorized to view.

### 4. Seeding Scripts Require Failsafes
* **The Situation**: Database seed scripts (`prisma/seed.ts`) often generate "demo" users to populate the UI. 
* **The Lesson**: Running a demo seed in a production government database pollutes analytics and introduces unsecured backdoor accounts. TRAK's seed script was correctly engineered to "fail closed"—crashing immediately if it detects it is running in `NODE_ENV=production` while dev flags are active.

### 5. There Is a Difference Between "Built" and "Ready"
* **The Situation**: The application "worked" visually before the audit, but received a 2.5/10 readiness score.
* **The Lesson**: Visual completion does not equal production readiness. True readiness requires architecture that can survive concurrent users (Redis, PostgreSQL), hostile actors (Rate Limiting, bcrypt, Opaque tokens), and operational mistakes (Environment Gates, CI/CD).
