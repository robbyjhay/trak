# Phase 5 — Hypercare (2 weeks post go-live)

## Goals

- Stabilize production after first real unit use.
- Triage defects within 1 business day.
- Confirm backups, probes, and auth flows stay healthy.

## Daily checklist (first 5 business days)

- [ ] `/api/health` and `/api/ready` green in monitor.
- [ ] Error tracker (Sentry) — review new issues; no CRITICAL unowned.
- [ ] Backup job succeeded overnight; artifact size non-zero.
- [ ] Spot-check: login as Head on staging clone or prod with care.
- [ ] Open tickets from UAT follow-up; priority CRITICAL/HIGH first.

## Weekly (week 1–2)

- [ ] Restore drill still within last 30 days (or run one on a clone).
- [ ] Review rate-limit 429 spikes on login (possible attacks or misconfig).
- [ ] Confirm `ENABLE_DEV_LOGIN=false` and no dev roster in production HTML.
- [ ] Capacity: bootstrap latency for Head < 3s p95 preferred.

## Exit criteria

- No open CRITICAL security or data-loss bugs.
- Head of Unit accepts residual risk for any open MEDIUM/LOW items.
- On-call table in `docs/runbooks.md` filled with real names.
- End-of-hypercare review notes filed (date + attendees).

## Rollback trigger (examples)

- Auth completely unavailable for >30 minutes.
- Confirmed data corruption or cross-user DM leak.
- Unrecoverable migration; restore from pre-cutover backup.

See `docs/runbooks.md` → Rollback and `docs/go-live-checklist.md`.
