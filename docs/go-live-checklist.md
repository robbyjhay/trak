# Phase 5 — Go-live checklist

Source: `Audit files/AUDIT_08_PRODUCTION_CHECKLIST.txt` · Phase 5 — Launch.

Use this list with DLU Head + technical owner. Check items only after evidence
(screenshots, ticket links, or run logs) is attached.

## Companion docs

| Doc | Purpose |
|-----|---------|
| [uat-script.md](./uat-script.md) | Staging UAT steps for Head + members |
| [runbooks.md](./runbooks.md) | Deploy, backup, rollback, on-call |
| [hypercare.md](./hypercare.md) | 2-week post-launch care |
| `scripts/smoke-launch.mjs` | Launch-day automated smoke |
| `scripts/check-prod-env.mjs` | Production env gate |

## 1. Staging UAT

- [ ] Staging environment deployed with production-like env (no dev login).
- [ ] UAT script (`docs/uat-script.md`) completed with Head of Unit + ≥2 sample members.
- [ ] Critical paths signed off: login, set password, create activity, log + RSVP,
      messaging DM, report print, add member, forgot password.
- [ ] Mobile smoke (360–414px) on login, dashboard, messages.
- [ ] Accessibility spot-check: keyboard tab order on login, dialogs Escape, skip link.
- [ ] Dashboard does **not** stick on “Loading Trak…” after set-password / skip.

## 2. Production environment & secrets

Run: `NODE_ENV=production node scripts/check-prod-env.mjs` (must exit 0).

- [ ] `DATABASE_URL` points at production Postgres (approved region).
- [ ] `TRAK_SESSION_SECRET` generated (≥32 chars), stored in secret manager.
- [ ] `TRAK_JWT_SECRET` / `CSRF_SECRET` set if used.
- [ ] `APP_URL` is the public HTTPS origin.
- [ ] `REDIS_URL` set for rate limiting.
- [ ] SMTP credentials + `EMAIL_FROM` verified with a test invite + reset.
- [ ] `SENTRY_DSN` + `SENTRY_ENVIRONMENT=production` set.
- [ ] `ENABLE_DEV_LOGIN=false`
- [ ] `SEED_DEMO_USERS=false`
- [ ] `FEATURE_WEBRTC_CALLS` as product decision.
- [ ] WebSocket `/ws` requires valid `trak_session` cookie (unauthenticated register rejected).
- [ ] No shared default passwords in seed or source.
- [ ] `DEV_SEED_PASSWORD` **unset** in production.

## 3. DNS + TLS

- [ ] DNS A/AAAA (or CNAME) for production hostname.
- [ ] TLS certificate valid; HTTPS redirect enforced.
- [ ] HSTS observed in production responses (proxy headers).
- [ ] CSP present on HTML responses in production.

## 4. Data

- [ ] `npm run db:migrate:deploy` applied on production.
- [ ] Run `npm run admin:bootstrap` to securely provision the initial Head account.
- [ ] Subsequent members added via Head admin workflow.
- [ ] Access control list: who may be Head is written and approved.
- [ ] PII hosting region accepted by unit.

## 5. Monitoring & backups

- [ ] `/api/health` and `/api/ready` monitored with alerts.
- [ ] Sentry (or equivalent) receiving a test error.
- [ ] Nightly `db:backup` scheduled; off-host storage confirmed.
- [ ] Restore drill completed within last 30 days (see runbooks).
- [ ] On-call owner named in `docs/runbooks.md`.

## 6. Security final gate

- [ ] `npm audit` clean at high+ (CI job).
- [ ] Dev roster / dev-fill unreachable in production.
- [ ] Rate limits verified on login (429 after threshold).
- [ ] RSVP requires signed token (no bare logId abuse).
- [ ] Bootstrap / APIs do not leak other users' private data.
- [ ] Skip password control is **not** available when `ENABLE_DEV_LOGIN=false`.

## 7. Go-live communication

- [ ] Go-live window communicated to unit staff.
- [ ] Head has admin credentials and password-reset path documented.
- [ ] Support channel for hypercare announced.
- [ ] Rollback owner and decision criteria agreed.

## 8. Launch day

```bash
# Pre-cutover
npm run db:backup
NODE_ENV=production node scripts/check-prod-env.mjs

# Deploy
npm ci && npm run db:migrate:deploy && npm run build && npm start

# Smoke (against production URL)
BASE_URL=https://your-prod-host \
SMOKE_USER=… SMOKE_PASSWORD=… \
npm run smoke:launch
```

- [ ] Final backup taken immediately before cutover.
- [ ] Deploy production build; migrations applied.
- [ ] Smoke tests: health, ready, login, session, bootstrap (`npm run smoke:launch`).
- [ ] Manual smoke: dashboard, one activity, one RSVP.
- [ ] Disable any temporary maintenance page.
- [ ] Announce "systems live" to unit.

## 9. Hypercare (2 weeks)

Follow `docs/hypercare.md`.

- [ ] Daily check of error rates and probe status (first 5 business days).
- [ ] Log and triage UAT-follow-up bugs within 1 business day.
- [ ] Confirm backups still succeeding.
- [ ] End-of-hypercare review with Head; close open CRITICAL items.

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Head of Unit | | | |
| Technical owner | | | |
| Security review | | | |

**Trak is production-ready only when Phases 0–4 are complete (or risk-accepted
in writing) and this checklist is signed.**
