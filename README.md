# Trak

**Trak** is the Digital Learning Unit (DLU) activity & operations register for
PSSDC · Lagos State Government. It tracks activities, daily logs, attendance
(including public RSVP links), responsibilities, team messaging, notifications,
profiles, and printable reports.

## Stack

- Next.js (App Router) · React · TypeScript · Tailwind CSS
- PostgreSQL via Prisma 7
- Opaque session cookies · bcrypt (cost 12)
- Redis (optional locally; required for multi-instance rate limiting)
- Nodemailer SMTP for invite / password-reset / password-changed mail
- Vitest (unit) · Playwright (e2e) · GitHub Actions CI

## Quick start

```bash
cp .env.example .env
# Fill DATABASE_URL, TRAK_SESSION_SECRET (≥32 chars), and optional SMTP/Redis

npm ci
npm run db:migrate
npm run db:seed          # dev: Head (+ demo when SEED_DEMO_USERS=true); prod: catalog only
npm run dev              # http://localhost:3000
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Custom server (HTTP + WebSocket signaling) |
| `npm run build` / `start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright critical paths |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:migrate:deploy` | Prisma migrate (prod/CI) |
| `npm run db:seed` | Dev: Head (+ demo if `SEED_DEMO_USERS`); prod: responsibilities only (no users) |
| `npm run db:backup` | `pg_dump` snapshot under `backups/` |
| `npm run db:restore` | Restore drill helper |

## Health probes

- `GET /api/health` — liveness (process up)
- `GET /api/ready` — readiness (Postgres reachable)

## Auth flows

- Sign in: `/login`
- Forced initial password: `/set-password`
- Forgot / reset: `/forgot-password` → email → `/reset-password?token=…`

### Phase 5 launch tooling

```bash
npm run check:prod-env          # production env gate
npm run smoke:launch            # health + login + bootstrap against BASE_URL
```

See `docs/go-live-checklist.md`, `docs/uat-script.md`, and `docs/hypercare.md`.
- Invite accept: `/accept-invite?token=…` (sent when Head adds a member with email)

## Production notes

See `docs/runbooks.md` and `docs/go-live-checklist.md`.

**Before go-live:**

1. Set production secrets (`TRAK_SESSION_SECRET`, `DATABASE_URL`, SMTP, Redis, Sentry).
2. `ENABLE_DEV_LOGIN=false` and `SEED_DEMO_USERS=false`.
3. Run migrations: `npm run db:migrate:deploy`.
4. Confirm HTTPS / HSTS / CSP (middleware emits production security headers).
5. Verify backups and a restore drill.

## Documentation

| Path | Contents |
|------|----------|
| `Audit files/` | Immutable production-readiness specs (AUDIT_00–08) |
| `docs/runbooks.md` | Deploy, backup, load-test ops |
| `docs/go-live-checklist.md` | Phase 5 launch checklist |
| `.env.example` | All environment variables |

## License

Private — Lagos State Government · PSSDC · Digital Learning Unit.
