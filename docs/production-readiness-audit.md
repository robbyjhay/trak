# TRAK PRODUCTION READINESS AUDIT

**Date:** 2026-08-11  
**Scope:** Repository forensic audit (`note.txt` methodology). Prior Gemini (~45) and Copilot (~22) audits treated as untrusted hypotheses.  
**Method:** Source inspection + independent claim verification (deep-research: 22/24 claims retained). Runtime/CI execution and live infrastructure not exercised unless noted.

---

## 1. Executive Verdict

| Question | Answer |
|----------|--------|
| **Can TRAK be deployed to production today?** | **NO** |
| Primary reason | Remaining security gaps (unauthenticated WebSocket identity; CSRF absent; bootstrap still exposes full active roster PII) plus unsigned ops/config gates — not missing core domain features |
| Core product | Largely present end-to-end (auth, activities, logs, RSVP, messaging, notifications, Prisma/Postgres) |
| Prior “critical” code claims | Several **FALSE or remediated** (session forging fallback, shared prod seed password, RSVP logId injection, password-skip bypass, missing migrations/APIs) |

### Minimum exact set before deployment

1. **Authenticate WebSocket `/ws` identity** from validated session cookie (or hard-disable calls until done).
2. **Pass** `NODE_ENV=production node scripts/check-prod-env.mjs` with real secrets (no dev flags).
3. **Complete and sign** `docs/go-live-checklist.md` (staging UAT, SMTP, backups, monitoring).
4. **Harden residual confidentiality:** bootstrap user list field minimization and/or `GET /api/users/[id]` authorization as product requires.
5. **CSRF or Origin checks** on cookie-auth mutating APIs (or document SameSite-Lax residual risk acceptance).

---

## 2. Repository Reality

| Item | Reality |
|------|---------|
| Framework | Next.js **16.3.0**, React **19.2.8**, App Router under `src/app` |
| Entrypoint | `tsx server.ts` (dev + production start) |
| Build | `prisma generate && next build` |
| Database | PostgreSQL via Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`) |
| Auth | Opaque DB sessions (`trak_session` cookie → SHA-256 hash in `sessions`) |
| API | App Router handlers under `src/app/api` (~46 method exports) |
| Realtime | `ws` on `/ws` + client WebRTC audio (public STUN) |
| CI | GitHub Actions: lint, typecheck, unit, e2e (Postgres+Redis), `npm audit`, production build |
| Deploy | Documented manual scripts/runbooks; no automated deploy job |

---

## 3. Architecture Assessment

```
Browser UI
  → GET /api/bootstrap (scoped) + domain APIs (apiSend/apiGet)
  → Prisma service layer → PostgreSQL
  → WebSocket /ws for call signaling + presence
  → WebRTC peer media (audio), REST call records on /api/messages/calls
```

- Authenticated shell: session required; `mustChangePassword` → `/set-password`.
- Custom HTTP server wraps Next request handler and attaches WebSocketServer.
- Legacy JSON/`.data` store deprecated; migration scripts retained; **not** used on application request paths.

---

## 4. Database Reality

```text
DATABASE REALITY

Prisma schema exists: YES
Prisma used at runtime: YES
PostgreSQL used at runtime: YES (via adapter + Pool)
Legacy JSON store exists: YES (deprecated / migration)
Legacy JSON store used at runtime: NO (no @/lib/db/store under src/)
Mock DB used at runtime: PARTIAL (helpers / empty shaping in client store only; not write path)
Production migrations exist: YES (auth foundation, audit events, domain tables)
Source of truth: PostgreSQL via Prisma service layer
```

**UNKNOWN:** Whether a given target environment has already run `migrate deploy` / seed.

---

## 5. Authentication & Security

| Finding | Severity | Status | Evidence |
|---------|----------|--------|----------|
| Hardcoded session secret / forgeable JWT sessions | Critical (historical) | **FALSE / remediated** | Opaque tokens; `validateSession`; `TRAK_SESSION_SECRET` required ≥32 |
| Shared production seed password | Critical (historical) | **FALSE** for prod create paths | Unique temp passwords + `mustChangePassword`; shared only under non-prod `ENABLE_DEV_LOGIN` |
| Unscoped bootstrap (full private data) | High | **PARTIAL** | DMs/calls/notifications/member activities scoped; still `listUsers()` all active profiles incl. phone |
| RSVP arbitrary logId | High | **Remediated** | Crypto RSVP token; rate limits |
| mustChangePassword / skip bypass | High | **Enforced** | Skip/dev-fill blocked when dev login off |
| CSRF on cookie-auth mutations | Medium–High | **CONFIRMED missing** | No double-submit/Origin checks; `sameSite: "lax"` only |
| WebSocket client-supplied userId | High | **Remediated** (session cookie binds identity) | `server.ts` + `src/lib/auth/ws-session.ts` |
| Rate limiting | Medium | **PARTIAL** | Login, forgot, RSVP, bootstrap, DMs; Redis if `REDIS_URL` else memory |
| IDOR | Medium | **PARTIAL** | Many ownership checks; `GET /api/users/[id]` session-only |
| Upload HMAC fallback `"dev"` | Low–Med | **PARTIAL** | Residual when secret unset |
| Health / ready | — | **Present** | `/api/health`, `/api/ready` (DB `SELECT 1`) |

---

## 6. Authorization / RBAC

- Roles: head / member (+ secretary, corps flags).
- Activity and messaging paths enforce session and many ownership/role checks.
- Residual: any authenticated user can read other users’ profile endpoints and receives full active roster in bootstrap.
- Admin audit routes exist; depth of UI coverage not exhaustively runtime-tested.

---

## 7. API Inventory (summary)

Handlers span: auth (login/logout/password/invite), bootstrap, users, activities/logs/comments, responsibilities, messaging (DM/community/broadcast/calls), notifications, RSVP, uploads, reports, admin audit, health/ready.

| Class | Assessment |
|-------|------------|
| Auth + password recovery + invite | Complete (code path) |
| Domain CRUD | Present via Prisma service |
| Dev-only | `dev-fill` gated by non-prod `ENABLE_DEV_LOGIN` |
| Production-safe default | Many routes yes; CSRF/WS/bootstrap caveats |

Full per-route table omitted for brevity; regenerate from `src/app/api/**/route.ts` if needed for compliance packing.

---

## 8. Feature Completeness

| Category | Examples |
|----------|----------|
| **A. Genuinely complete (code E2E)** | Login/session, set/forgot/reset password, accept invite, activities/logs, RSVP token flow, DMs/community messaging, notifications, bootstrap-backed UI shell |
| **B. Partial** | WebRTC calls (signaling + STUN only; no TURN/auth was missing; multi-instance WS not addressed); reports; file uploads (storage backends vary by env) |
| **C. Scaffolded** | `FEATURE_WEBRTC_CALLS` env documented but not enforced in `src/` |
| **D. Missing / external** | Live production SMTP/Sentry/Redis/backup schedule (ops, not repo) |

---

## 9. Frontend Assessment

- Rail: dashboard, new activity, activities, responsibilities, messages, settings; profile, member, activity detail; public RSVP; auth pages.
- Protected app layout requires session; password gate for first login.
- Client mutations via `TrakStore` → APIs (not JSON store writes).
- Accessibility: Playwright e2e smoke exists; not a full a11y audit.

---

## 10. WebRTC / Real-Time Assessment

| Component | Status |
|-----------|--------|
| Custom server + `/ws` | Present (`server.ts`) |
| Signaling messages | offer/answer/ICE/accept/reject/end + presence |
| Client hooks | `useSignaling`, `useWebRtc`, `CallProvider` |
| STUN | Public Google STUN |
| TURN | Not configured |
| **WS identity auth** | **Required fix** (session cookie → user id) |
| Multi-node fan-out | In-memory map only — single instance assumption |
| `FEATURE_WEBRTC_CALLS` | Product flag in env/docs; not code-gated |

---

## 11. Testing & QA

| Layer | Reality |
|-------|---------|
| Unit (Vitest) | 8 files under `src/__tests__/` (auth, password, permissions, RBAC, tokens, RSVP, pagination) |
| E2E (Playwright) | accessibility, auth, health, login |
| Coverage thresholds | Not configured; CI invokes `--coverage` (verify `@vitest/coverage-*` present in CI image) |
| Domain API/WebRTC tests | Largely absent |
| CI pass status this audit | **UNKNOWN** (not executed in forensic pass) |

---

## 12. Infrastructure & Deployment

| Capability | In-repo |
|------------|---------|
| CI pipeline | Yes |
| Auto-deploy | No |
| Health/ready | Yes |
| Logging / optional Sentry | Yes |
| Backup/restore scripts | Yes |
| Prod env gate | `scripts/check-prod-env.mjs` |
| Go-live / UAT / hypercare docs | Yes (`docs/`) |
| Docker | Not required by this app’s documented model |

---

## 13. Performance & Scalability

- Pagination helpers: default 50 / max 100.
- Load script: k6 baseline against `/api/health` and `/login` only.
- **Not measured:** production latency, concurrent users, WS memory under load.
- Historical “full bootstrap dump” cost partially mitigated by scoped bootstrap; roster still full.

---

## 14. Code Quality & Technical Debt

- Deprecated JSON store retained for migration.
- `mockDb` helpers still imported in client store paths.
- Large `TrakStore` with eslint-disable.
- Not production blockers by themselves.

---

## 15. Conflict Resolution: Gemini vs Copilot

| Claim | Gemini | Copilot | Repository Reality | Correct assessment |
|-------|--------|---------|--------------------|--------------------|
| Prisma integration | Present / may overstate completeness | Domain still JSON | Prisma used on request paths; JSON deprecated | **Gemini closer** |
| Migrations empty/missing | — | Claimed missing | Three migrations incl. domain | **Copilot FALSE** |
| Core APIs missing | MVP exists | Largely missing | Activities/messaging/RSVP routes exist | **Copilot FALSE** |
| Session secret fallback | Hardening needed | Critical hardcoded | Opaque sessions; secret required | **Mostly remediated** |
| Shared seed password | Backdoors concern | Critical | Prod create unique temp; dev seed only | **Copilot overstated for current prod paths** |
| Bootstrap scoping | — | Critical leak | Partial scope fix | **PARTIAL** |
| RSVP security | — | Critical | Token + rate limits | **Remediated** |
| CSRF | Hardening | Missing | Missing | **Both right** |
| Tests / CI | Existing tests | No meaningful tests/CI | Narrow but real unit+e2e+CI | **Gemini closer** |
| Health checks | — | May be missing | Present | **Copilot FALSE** |
| Readiness score | ~45 | ~22 | See §20 | **Neither inherited; mid-high 50s with blockers** |
| WebSocket architecture | Needs prod signaling | Deploy constraints | Custom server works; **identity auth was missing** | Both partially right |

---

## 16. Confirmed Production Blockers

### TRUE BLOCKERS

| Severity | Finding | File(s) | Required fix | Blocks? |
|----------|---------|---------|--------------|---------|
| High | WS register trusts client `userId` | `server.ts` | **Done:** session-cookie auth | Was yes; re-verify in staging |
| Ops | Prod env + go-live unsigned | `check-prod-env.mjs`, `go-live-checklist.md` | Configure + sign | **Yes** |

### IMPORTANT BUT NON-BLOCKING (launch risk / policy)

| Finding | Fix |
|---------|-----|
| CSRF absent | Double-submit or Origin allowlist |
| Bootstrap full roster PII | Minimize fields / scope |
| `GET /api/users/[id]` session-only | Role or self-or-head check; field strip |
| Upload HMAC `\|\| "dev"` | Fail closed without secret in prod |
| No TURN / multi-instance WS | Accept single-node + STUN-only or add infra |

### POST-LAUNCH

- Broader API test coverage, load tests, optional `FEATURE_WEBRTC_CALLS` UI gate, remove dead JSON store after all envs migrated.

---

## 17. MVP Definition

### MUST HAVE BEFORE LAUNCH

- Auth (login, session, first password, forgot/reset)
- Head + member roster management
- Activities + daily logs + RSVP
- Messaging (at least DM)
- Notifications
- Prod env gate green; backups scheduled; health/ready monitored
- WS auth **or** calls disabled

### SHOULD HAVE BEFORE LAUNCH

- CSRF/Origin protection
- Bootstrap PII minimization
- SMTP verified invites
- Sentry receiving events
- UAT sign-off

### CAN WAIT

- TURN, horizontal WS, full report polish, deep a11y suite, JSON store deletion

---

## 18. Prioritized Engineering Roadmap

### PHASE 0 — Security & Safety

| Task | Priority | Complexity | DoD |
|------|----------|------------|-----|
| WS session binding | P0 | S–M | Unauthenticated register impossible |
| CSRF / Origin | P0 | M | Mutating cookie APIs reject bad origin |
| Bootstrap / users IDOR hardening | P1 | S–M | No unnecessary phone dump |
| Upload HMAC fail-closed | P1 | S | No `"dev"` in prod |
| Disable calls if WS not ready | P0 alt | S | Feature flag enforced |

### PHASE 1 — Data

- Confirm migrate deploy on all envs; optional JSON migration only if `.data` exists.

### PHASE 2–3 — Product / UX

- Close partial UI gaps; enforce call feature flag in UI.

### PHASE 4 — Testing

- Expand unit/API tests for IDOR and auth; e2e happy paths for activity+RSVP+DM.

### PHASE 5–6 — Infra & launch

- Staging UAT, smoke-launch, signed go-live, hypercare.

---

## 19. Exact Next Engineering Task

**Completed in-repo:** WebSocket identity is bound from the `trak_session` cookie via `src/lib/auth/ws-session.ts` + `server.ts` (client `userId` ignored).

**Next recommended task:**

> **Add CSRF or Origin checks** on cookie-authenticated mutating APIs, then **minimize bootstrap user roster fields** (phone etc.) and lock down `GET /api/users/[id]`.

**Why:** Remaining Phase 0 confidentiality/integrity gaps after WS auth.

---

## 20. Final Production Score

**Methodology:** Weighted categories from `note.txt` §16. Scores are **evaluative judgment** grounded in verified code facts, not a measured metric. They intentionally do **not** inherit 22 or 45.

| Category | Score | Notes |
|----------|------:|-------|
| Security | 18/25 | Auth solid; WS session-bound; CSRF missing; bootstrap PII |
| Features | 15/20 | Core DLU flows present; calls/TURN partial |
| Database | 13/15 | Prisma/migrations solid; dual-store debt residual |
| Testing | 4/10 | Real but narrow; many APIs untested |
| Reliability | 6/10 | Health/ready/logging/Sentry hooks; ops not proven live |
| Infrastructure | 6/10 | CI + runbooks + env gate; no auto-deploy |
| Performance | 2/5 | Pagination present; load unmeasured |
| Code quality | 3/5 | Debt present but navigable |
| **TOTAL** | **67/100** | **Not launch-ready** until remaining Phase 0 + ops gates |

---

## 21. Production Launch Checklist

Use existing `docs/go-live-checklist.md` as the signing surface. Additionally verify after this audit’s code fix:

- [ ] Unauthenticated WebSocket connection cannot register a user id.
- [ ] Authenticated user cannot bind WS identity to another user id.
- [ ] `check-prod-env.mjs` exit 0 on production config.
- [ ] Go-live checklist sections 1–7 completed with evidence.
- [ ] Head + technical owner sign production-ready.

---

*This document supersedes Gemini and Copilot scores for planning purposes. Re-audit after Phase 0 security work and a green staging UAT.*
