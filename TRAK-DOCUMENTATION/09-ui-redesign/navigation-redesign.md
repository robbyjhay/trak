# Navigation Redesign

This document details the changes made to TRAK's global navigation structures during the redesign.

## Original UI
The original navigation structure consisted of:
* **Desktop**: A sticky left rail (`Rail.tsx`) with icon links, and a topbar (`Topbar.tsx`) for user profiles and breadcrumbs.
* **Mobile**: A standard, flat bottom navigation bar (`MobileNav.tsx`) that squashed 6 icons horizontally. It was functional but cramped.

## Redesign Objectives
1. **Semantic Theming**: Ensure all navigation elements respond correctly to Dark Mode.
2. **Mobile Ergonomics**: Solve the cramped mobile navigation and emphasize the primary user action (creating a new activity).

## Changes Implemented

### Desktop Navigation (Rail & Topbar)
Changes to the desktop navigation were primarily token-based:
* The hardcoded `bg-aztec` was replaced with semantic tokens (`bg-navigation`, `text-navigation-foreground`).
* The active and hover states were explicitly defined in `globals.css` (`--navigation-hover`, `--navigation-active`) to ensure contrast in both Light and Dark modes.

### Mobile Navigation (The "Scoop" FAB)
The `MobileNav.tsx` component underwent a massive structural and visual overhaul:
* **Navigation Split**: The cramped 6-icon list was split into `NAV_LEFT` (Dashboard, Activities) and `NAV_RIGHT` (Messages, Responsibilities).
* **Central Floating Action Button (FAB)**: The "New Activity" link was removed from the standard horizontal flow. It was elevated into a prominent, central FAB (`PATHS.plus`) sitting above the nav bar.
* **SVG Scoop Background**: To seamlessly integrate the FAB, a complex `<ScoopBackground>` component was engineered using raw SVG paths and `radialGradient`. This creates a visual "cutout" or "scoop" in the navigation bar that cradles the floating button.
* **Theming**: The SVG gradient dynamically reads CSS variables (`var(--aztec-3)`, `var(--aztec)`) to ensure the complex geometry matches the active theme perfectly.

## Result
The desktop navigation received a necessary tokenization pass, while the mobile navigation was completely reimagined to provide a highly ergonomic, app-like experience centered around activity creation.
