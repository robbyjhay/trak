# Original UI Baseline Audit

This document establishes the baseline user interface of TRAK before the `ui-redesign` phase commenced, based on commit `c3bd62c` (the state of the application after Phase 4 Production Hardening).

## Navigation
* **Desktop Rail**: A fixed vertical navigation bar on the left side of the screen (`w-rail`). Hardcoded to `bg-aztec`.
* **Topbar**: A sticky header containing breadcrumbs, a notification bell, and a user profile dropdown. 
* **Mobile Navigation**: A flat, horizontal bottom navigation bar (`MobileNav`) displaying up to 6 icons. Visually cramped and lacked a clear primary action.

## Dashboard
* **Layout**: A single page displaying the date and a generic greeting.
* **KPI Cards**: Four identical, small rectangular cards displayed horizontally (Pending, Completed, Missed, Total). There was no visual hierarchy to indicate which metric was most critical.
* **Head Dashboard Tabs**: For unit heads, the dashboard featured rectangular toggle buttons (`bg-aztec` with sharp rounded corners) labeled "mine" and "ao" (Accounting Officer).

## Activities
* **Activity List**: Tabbed interface (Pending, Completed, Missed). Each activity row displayed a type icon, title, dates, and badges.
* **Activity Detail**: A complex, multi-state stepper flow utilizing modals for file uploads and inline components for budget tracking.

## Connect (Messaging)
* **Layout**: A split-pane desktop view and a mutually exclusive full-screen overlay on mobile.
* **Styling**: Relied on light-theme hardcoded utility classes. Incoming messages were `bg-neutral-bg`, outgoing were `bg-aztec-2`. Text was strictly `text-ink`. 
* **Architecture**: A single, massive 600+ line component (`Messaging.tsx`) governed the entire suite (list, thread, composer, call panel).

## Settings
* **Features**: Basic forms for updating passwords.
* **Theme Limitations**: Zero user-facing theme controls. The application was entirely bound to Light Mode.

## Styling (Design System)
* **Colors**: Strictly defined brand colors.
  * `Aztec` (Dark green)
  * `Saffron` (Yellow)
  * `Paper` (Off-white canvas)
  * `Ink` (Dark text)
* **Typography**: Fraunces (serif) for display, Archivo for UI, JetBrains Mono for numbers.
* **Component States**: Hover and active states were often manually assigned utility classes (e.g., `hover:bg-aztec-2`) leading to inconsistencies across components.

## Responsive Behaviour
* **Desktop/Tablet**: Generous spacing leveraging CSS Flexbox and Grid.
* **Mobile**: The UI was primarily a "squashed" version of the desktop view, lacking mobile-specific ergonomic affordances beyond the standard bottom nav bar.
