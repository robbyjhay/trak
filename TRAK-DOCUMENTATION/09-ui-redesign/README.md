# Phase 05 — UI Redesign & Product Transformation

This directory documents the ongoing visual overhaul of the TRAK interface.

## The Redesign Story

**The Original Interface**
When TRAK was transitioned from its original prototypes into a functional React application, the styling was a direct 1:1 port. The interface relied heavily on a hardcoded brand palette: "Aztec" (a dark green) and "Saffron" (yellow). Components were built using strict Tailwind utility classes like `bg-aztec` and `text-ink`.

**Problems Discovered**
As the application matured into a production-ready system, this hardcoded approach became a liability. It was impossible to implement modern features like Dark Mode because the text and background colors were strictly defined. Furthermore, the dashboard lacked visual hierarchy, and the mobile navigation was cramped.

**The Decision to Redesign**
To solve this, development branched off `main` into `ui-redesign`. The goal was not to change the functionality of TRAK, but to transform its visual architecture into a scalable, semantic design system.

**The Design Token Migration**
The first major step was abandoning the brand colors in component code. `tailwind.config.ts` and `globals.css` were completely rewritten. Instead of asking for `bg-aztec`, components now ask for `bg-surface` or `bg-primary`. The CSS root determines what color "surface" actually is based on the active theme.

**Theme Architecture**
With semantic tokens in place, a `ThemeContext.tsx` was engineered to allow users to toggle between Light, Dark, and System modes, saving their preference to `localStorage`.

**Refactoring the Experience**
* **Dashboard**: The flat grid of identical cards was replaced with an asymmetrical hierarchy, highlighting key metrics.
* **Navigation**: The mobile bottom bar was redesigned to feature a prominent, SVG-driven central "floating action button" (FAB) for activity creation.
* **Connect**: The monolithic messaging component is currently being decoupled into smaller, theme-aware components.

**Current State**
The redesign is actively **In Progress** on the `sync-main` branch. The foundational CSS variables and Theme Context are functional, but many individual components across the application are still awaiting their semantic token updates.

---

## Documents in this Section

* **[original-ui-audit.md](./original-ui-audit.md)**: The baseline interface before redesign.
* **[redesign-objectives.md](./redesign-objectives.md)**: Why the redesign was necessary.
* **[design-system.md](./design-system.md)**: The transition to semantic tokens.
* **[theme-system.md](./theme-system.md)**: The architecture of Light/Dark mode.
* **[dashboard-redesign.md](./dashboard-redesign.md)**: Changes to the KPI interfaces.
* **[navigation-redesign.md](./navigation-redesign.md)**: Changes to desktop and mobile routing UI.
* **[connect-redesign.md](./connect-redesign.md)**: The decoupling and restyling of the messaging suite.
* **[git-history.md](./git-history.md)**: A chronological reconstruction of the redesign commits.
* **[before-vs-after.md](./before-vs-after.md)**: A summary comparison matrix.
