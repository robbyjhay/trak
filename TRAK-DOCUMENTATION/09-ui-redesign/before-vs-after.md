# Before vs After: UI Redesign

This matrix summarizes the state of the application before the `ui-redesign` branch, compared to the current work staged on `sync-main`.

| Area | Before (Phase 4) | After (Redesign Phase) | Status |
| :--- | :--- | :--- | :--- |
| **Colors** | Hardcoded utility classes (`bg-aztec`, `text-ink`) | Semantic Tokens (`bg-surface`, `text-foreground`) | Implemented |
| **Theme** | Locked to Light Mode | User-controlled Context (Light/Dark/System) | Implemented |
| **Navigation** | Cramped flat bottom bar (`MobileNav`) | Custom SVG "Scoop" with central FAB | Implemented |
| **Dashboard** | Flat grid of identical KPI cards | Asymmetrical grid with strong visual hierarchy | Implemented |
| **Activities** | Hardcoded status colors (`bg-warning-bg`) | Semantic status tokens (`bg-warning-surface`) | Implemented |
| **Connect** | Monolithic 600-line component | Decoupled components (`ConversationList`, etc.) | In progress |
| **Settings** | Empty placeholder text | Functional `ThemeSettings` and `DefaultPasswordForm` | Partially migrated |
| **Mobile** | "Squashed" desktop view | Purpose-built mobile ergonomics and layouts | In progress |
| **Components** | Brittle brand-locked components | Theme-agnostic semantic components | In progress |
| **Accessibility/Focus** | Inconsistent focus rings | Standardized `focus:ring-primary` | Partially migrated |

## Status Definitions
* **Implemented**: The core architectural work and component refactoring are complete in the `sync-main` branch.
* **In progress**: Active development is occurring on these items in the uncommitted working tree.
* **Partially migrated**: The architecture exists, but not all components across the application have been updated to utilize it.
