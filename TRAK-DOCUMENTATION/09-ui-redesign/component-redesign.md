# Component Redesign

This document outlines how reusable, shared components were adapted during the UI redesign.

## General Component Philosophy
Prior to the redesign, components were styled as one-off implementations using the brand palette (Aztec, Saffron, Paper). The redesign enforces a strict "Semantic Token Only" rule for reusable components, ensuring they automatically adapt to Light and Dark themes via the CSS variables defined in `globals.css`.

## Core Components Migrated

### Buttons (`src/components/ui/Buttons.tsx`)
* **Original**: `PrimaryBtn` was hardcoded to `bg-saffron text-aztec hover:bg-yellow-400`. `GhostBtn` was `text-ink-soft hover:bg-neutral-bg`.
* **Redesign**:
  * `PrimaryBtn` now uses `bg-primary text-primary-foreground hover:bg-primary-hover`.
  * `GhostBtn` now uses `text-foreground-secondary hover:bg-surface-muted hover:text-foreground`.
* **Impact**: Buttons now look appropriate against the dark charcoal background of Dark Mode without requiring any component-level logic changes.

### Modals (`src/components/ui/Modal.tsx`)
* **Original**: Modal backdrops were a hardcoded `rgba(13, 29, 26, 0.4)` (Aztec with opacity), and panels were `bg-paper border-line`.
* **Redesign**:
  * Backdrops now use `bg-overlay`, which maps to a darker, more opaque black in Dark Mode (`rgba(0, 0, 0, 0.6)`) to properly obscure the illuminated dark background.
  * Panels use `bg-modal` (which maps to `bg-surface` or a slightly elevated surface in Dark Mode) and `border-border`.

### Activity Rows (`src/components/activity/ActRow.tsx`)
* **Original**: `border-line bg-transparent hover:border-saffron-dim hover:-translate-y-px`.
* **Redesign**: `border-border bg-surface hover:border-primary`.
* **Impact**: The hover state is now mathematically linked to the primary theme color. If the unit changes their primary brand color in `globals.css` from Saffron to Blue, the hover state on all activities will automatically update to Blue.

## Focus & Accessibility States
The redesign also standardized keyboard focus states. Previously, focus outlines were a mix of browser defaults and hardcoded Tailwind rings (`focus:ring-saffron`). The new architecture relies on `focus:ring-primary`, ensuring keyboard navigators can clearly see their focus position regardless of the active theme.

## Current State
Component migration is ongoing. While core layout components (Buttons, Modals) have been transitioned, complex nested components (such as the Connect `Composer.tsx`) are currently being actively refactored on the `sync-main` branch.
