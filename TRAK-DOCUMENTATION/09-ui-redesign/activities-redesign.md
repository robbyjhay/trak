# Activities Redesign

This document outlines the visual and structural changes made to the Activities views (`/activities` and `/activity/[id]`) during the redesign phase.

## Original UI
The original activities views were functional and closely mirrored Prototype 2. The `/activities` list utilized hardcoded status colors (`bg-warning-bg`, `bg-good-bg`) and standard `border-line` borders. The `/activity/[id]` detail view featured a complex day-by-day stepper flow that also relied entirely on the original Aztec/Saffron palette.

## Redesign Objectives
1. **Semantic Theming**: The primary goal for this section was migrating the vast number of text, border, and background classes to semantic tokens to enable Dark Mode support without breaking the complex form layouts.
2. **Component Polish**: Improve hover states and transition animations on the activity cards.
3. **UX Refinements**: Minor usability tweaks based on user feedback (e.g., allowing activity date extensions).

## Changes Implemented

### Activity List (`/activities`)
* **Semantic Status Indicators**: Hardcoded status colors were mapped to the new semantic system.
  * Pending: `bg-warning-bg` → `bg-warning-surface text-warning-foreground`
  * Completed: `bg-good-bg` → `bg-success-surface text-success`
  * Missed: `bg-critical-bg` → `bg-critical-surface text-critical-semantic`
* **Card Ergonomics**: The `ActRow.tsx` component was updated to use `bg-surface` and `border-border`. Hover states were refined to use `hover:border-primary` instead of the hardcoded `hover:border-saffron-dim`, ensuring the active state scales if the primary theme color is changed in the future.

### Activity Detail (`/activity/[id]`)
* **Stepper Redesign**: The day-by-day stepper UI was restyled using `bg-surface-elevated` and `border-subtle` to provide better visual depth in Dark Mode.
* **Form Inputs**: Text areas, budget inputs, and the voice transcription container were updated to use semantic focus rings (`focus:ring-primary`) and placeholder colors (`text-input-placeholder`).
* **Feature Tweak**: Alongside the visual redesign, a minor feature update was included allowing the Head of Unit or the activity owner to extend the activity's end date directly from the detail view.

## Current State
The activities redesign consists predominantly of a 1:1 CSS class migration to the new token system, rather than a fundamental layout reimagining. It is actively being committed in the `ui-redesign` branch.
