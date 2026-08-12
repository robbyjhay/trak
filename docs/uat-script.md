# Phase 5 — Staging UAT script

Source: `Audit files/AUDIT_08_PRODUCTION_CHECKLIST.txt` · Phase 5 Launch.

**Participants:** Head of Unit + ≥2 sample members  
**Environment:** Staging (production-like; `ENABLE_DEV_LOGIN=false`)  
**Facilitator:** Technical owner  

Record pass/fail + screenshots or ticket IDs in the go-live checklist.

## Pre-UAT

1. Staging deployed; `/api/health` and `/api/ready` green.
2. Head account credentials ready (unique password, not seed default).
3. Two member accounts provisioned (invite or Head “Add member”).
4. Mobile device or 360–414px browser viewport available.

## Script

| # | Actor | Steps | Expected | Pass |
|---|--------|--------|----------|------|
| 1 | Head | Open `/login`, sign in | Dashboard loads (not stuck on “Loading Trak…”) | ☐ |
| 2 | Head | If forced set-password, set a ≥12 char password | Redirect to dashboard; no return to set-password | ☐ |
| 3 | Head | Create activity (type Meeting), assign self | Appears under My Activities / pending | ☐ |
| 4 | Head | Open activity → submit daily log | Log saved; status updates | ☐ |
| 5 | Head | Generate RSVP link → open in private window → register attendee | Attendee appears on log | ☐ |
| 6 | Head | Messages → DM a member | Message delivers; member can reply | ☐ |
| 7 | Head | Broadcast short announcement | Members see notification | ☐ |
| 8 | Head | Open activity report / print preview | Printable report renders | ☐ |
| 9 | Head | Settings → change password | Success; re-login works | ☐ |
| 10 | Head | Add member with email | Username + starter password shown; invite email if SMTP configured | ☐ |
| 11 | Member A | Login with starter password | Forced set-password, then dashboard | ☐ |
| 12 | Member A | Create own activity + log | Own data only; no other members’ DMs visible | ☐ |
| 13 | Member B | Forgot password → email link → reset | Can login with new password | ☐ |
| 14 | Any | Mobile smoke: login, dashboard, messages | Usable at 360–414px; no horizontal overflow | ☐ |
| 15 | Any | Keyboard: Tab through login; Escape closes a dialog; skip link to `#main` | Focus visible; dialogs dismiss | ☐ |

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Head of Unit | | | Pass / Fail |
| Technical owner | | | Pass / Fail |
| Sample member | | | Pass / Fail |

**Notes / defects:**

-
