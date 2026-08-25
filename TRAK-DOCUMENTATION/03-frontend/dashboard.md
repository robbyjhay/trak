# Dashboard

**Page:** Dashboard
**Route:** `/dashboard`

## Purpose
Serves as the primary landing page for authenticated users, providing an immediate overview of their workload, unit performance, and quick actions.

## Who can access it
All authenticated users. The view branches significantly based on the user's role (Head vs. Member).

## Prototype Origin
**Classification:** B — Originally proposed but significantly changed.

**Prototype intent:** 
In Prototype 1, the dashboard was defined as an overview page showing personal KPIs, a weekly activity chart, and a breakdown by responsibility. For the Head of Unit, it included an "Accounting Officer" tab that displayed unit-wide metrics.

**Development evolution:**
During development, the concept of tabs for the Head was replaced by entirely distinct component renderings based on role. The dashboard became modularized into `HeadDashboard` and `MemberDashboard` to enforce strict data separation and provide tailored experiences. The `HeadDashboard` now integrates deeply with the database to show real-time completion rates and active unit activities.

## Main UI & Important Components
* **HeadDashboard**: Renders unit-wide statistics, a feed of all ongoing activities, and team performance metrics.
* **MemberDashboard**: Renders personal KPIs (Pending, Completed, Missed tasks) and upcoming deadlines.
* Both rely on shared KPI card components and charting libraries to visualize data.

## Backend & Database Dependencies
* Relies on Server Actions/Data fetchers to query the `Activity` and `User` models from Prisma.
* Queries count aggregates (e.g., pending vs. completed activities) grouped by user or unit.

## Interactions
* Clicking an activity routes to `/activity/[id]`.
* Quick actions route to `/new-activity`.

## Current Status
Fully implemented as a Server Component in the App Router. It is heavily utilized and serves as the root of the `(shell)` route group.
