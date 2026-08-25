# Frontend Documentation

This section documents the Next.js frontend implementation of TRAK. It covers the application's routing structure, component architecture, and the origin of each major page.

## Core Architecture
TRAK is built using the Next.js 16 App Router. The frontend relies heavily on React Server Components (RSCs) and Server Actions for data fetching and mutations, avoiding traditional API client fetching where possible.

## Pages

The frontend is divided into several major areas, documented individually:

* **[Dashboard](./dashboard.md)** (`/dashboard`): The main entry point and KPI overview.
* **[Activities](./activities.md)** (`/activities`): The list of a user's activities.
* **[Activity Detail](./activity-detail.md)** (`/activity/[id]`): The complex day-by-day logging interface.
* **[New Activity](./new-activity.md)** (`/new-activity`): The creation flow.
* **[Connect](./connect.md)** (`/messages`, `/contacts`): The real-time messaging and calling suite.
* **[Responsibilities](./responsibilities.md)** (`/responsibilities`): Management of official unit responsibilities.
* **[Members / Profile](./members.md)** (`/member/[id]`, `/profile`): Personnel records.
* **[Settings](./settings.md)** (`/settings`): User preferences and theme configuration.
* **[Authentication Pages](./authentication-pages.md)** (`/login`, `/accept-invite`, `/reset-password`): The onboarding and security flows.

*Note: The frontend is currently undergoing a visual transition in the `ui-redesign` branch, moving towards a standardized semantic token system.*
