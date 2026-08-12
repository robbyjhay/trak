# Trak Runbooks

## Deployment

1. Set environment variables from `.env.example` (production values only).
2. Run `npm ci`.
3. Run `npm run db:migrate:deploy`.
4. Run `npm run admin:bootstrap` to securely provision the initial Head account (one-time only).
5. Run `npm run build`.
6. Run `npm start` (binds the custom server in `server.ts`).
7. Confirm probes:
   - `GET /api/health` → `status: "ok"`
   - `GET /api/ready` → `status: "ready"`

### WebSocket signaling (`/ws`)

- Call presence and WebRTC signaling use the same host as HTTP (`server.ts`).
- Connections **must** present a valid `trak_session` cookie (same opaque session as REST).
- Unauthenticated upgrades are closed with code `4401`; client-supplied `userId` is never trusted.
- Scaling: Single-process by default. Set `TRAK_RUNTIME_MODE=multi` and provide `REDIS_URL` to enable cross-instance WebSocket signaling via Redis Pub/Sub.

### Required production env

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `TRAK_SESSION_SECRET` | ≥32 random characters |
| `APP_URL` | Canonical public URL (used in emails) |
| `NODE_ENV` | `production` |
| `TRAK_RUNTIME_MODE`| `single` or `multi` (requires `REDIS_URL`) |
| `ENABLE_DEV_LOGIN` | **must be `false`** |
| `SEED_DEMO_USERS` | **must be `false`** |
| `REDIS_URL` | Rate limiting & WS Pub/Sub (required for `multi` mode) |
| `SMTP_*` / `EMAIL_FROM` | Invite + password reset mail |
| `SENTRY_DSN` | Optional error monitoring |

## Backups & restore

- **Backup**: `npm run db:backup` (writes `backups/backup_<timestamp>.sql` via `pg_dump`).
- **Restore drill**: `npm run db:restore -- <backup_file>` (or `scripts/restore-drill.ts`).
- Schedule nightly backups in production and store off-host.
- Retention: keep at least 7 daily + 4 weekly snapshots.

### Restore procedure (incident)

1. Put app in maintenance (stop workers / scale to zero).
2. Confirm the backup file checksum.
3. Restore into a **new** database first when possible; verify with `/api/ready`.
4. Point `DATABASE_URL` at the restored DB and restart.
5. Smoke-test login, dashboard, and one activity report.

## Email

- Provider: SMTP via Nodemailer (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).
- Flows: member invite, password reset, password-changed notice.
- If SMTP is unset, send attempts fail soft and are logged; Head still receives one-time starter passwords in the UI for invites without email.

## Rate limiting

- Login and password-forgot are rate-limited (`RATE_LIMIT_LOGIN_*`).
- Redis is preferred; in-memory fallback is for single-instance dev only.

## Load testing

```bash
k6 run -e BASE_URL=https://staging.example.gov.ng scripts/load-test.js
```

Baseline script hits `/api/health` and `/login`. Extend scenarios before launch under staging load.

## Logging & monitoring

- Structured JSON logs via `src/lib/log.ts` with `x-request-id` correlation.
- Errors forward to Sentry when `SENTRY_DSN` is set.
- Alert on: probe failures, elevated 5xx, backup job failures, disk/DB saturation.

## Rollback

1. Redeploy previous known-good image/commit.
2. If a migration must be reversed, restore from the pre-deploy backup (forward-only migrations preferred).
3. Confirm `/api/health` and `/api/ready`, then smoke-test login.

## On-call contacts

| Role | Owner |
|------|--------|
| Application | _TBD — name Head of Unit technical lead_ |
| Database | _TBD — infra owner_ |
| Escalation | _TBD_ |

Update this table before production go-live.

## Launch day (Phase 5)

1. Pre-flight: `NODE_ENV=production node scripts/check-prod-env.mjs`
2. Backup: `npm run db:backup`
3. Deploy per **Deployment** section above.
4. Smoke:  
   `BASE_URL=https://… SMOKE_USER=… SMOKE_PASSWORD=… npm run smoke:launch`
5. Manual: login → dashboard (must leave “Loading Trak…”), create activity, RSVP.
6. Hand off to hypercare (`docs/hypercare.md`).

### Known first-paint issues

If the UI sticks on **Loading Trak… / Syncing with server**:

1. Check browser network tab for `GET /api/bootstrap` (status, duration).
2. Confirm `/api/ready` reports `database: "up"`.
3. Confirm session cookie `trak_session` is present after login.
4. Retry; if 408/timeout, check DB latency and pool (`src/lib/db/prisma.ts`).
5. Server logs: bootstrap should complete in well under 5s for seed-sized data.

## Hypercare

See `docs/hypercare.md` for the 2-week post-launch period, daily checks, and
exit criteria.
