# Redesign Objectives

This document explains why the application's user interface is currently undergoing a massive visual refactor.

## Context
When TRAK was transitioned from the original Vanilla JS prototypes into a Next.js React application, the styling strategy was to map the exact colors and layouts from the prototype into Tailwind CSS utility classes and global CSS variables. 

The application relied on a heavily branded, hardcoded color palette:
* `bg-aztec` (Dark green)
* `bg-saffron` (Yellow)
* `text-ink` (Dark text)
* `bg-paper` (Warm off-white background)

## Problems Identified
As the application grew into a complex full-stack system, these hardcoded visual constraints introduced severe engineering and UX problems:

1. **Weak Dark Mode Support**: Because utility classes were hardcoded (e.g., `text-ink`), implementing a proper Dark Mode was impossible without writing hundreds of conditional `dark:text-white` classes throughout the codebase. The `globals.css` file attempted a hacky "alias override" (`--paper: var(--aztec)`), but it was brittle and inconsistent.
2. **Inconsistent Component Styling**: As new components were added, the reliance on utility classes led to drift. Spacing, border colors (`border-line`), and interactive states (`hover:bg-aztec-2`) were manually applied, leading to a fragmented user experience.
3. **Mobile Experience Limits**: The original prototype was designed primarily for desktop/tablet. The initial React translation squashed the layout onto smaller screens via CSS grid adjustments. The mobile navigation was a standard, slightly cramped bottom bar that lacked ergonomic focus for the primary action (creating new activities).
4. **Maintenance Burden**: Changing a core brand color meant executing a massive search-and-replace across the entire repository.

## Redesign Goals
The `ui-redesign` branch was initiated with the following specific goals:
1. **Semantic Token System**: Migrate from hardcoded brand colors to functional semantic tokens (`bg-surface`, `text-foreground`, `border-border`) so themes can be switched at the CSS root level without touching component logic.
2. **First-Class Theme Architecture**: Implement a robust React context (`ThemeContext.tsx`) for user-controlled Light/Dark/System preferences.
3. **Ergonomic Mobile UX**: Redesign the mobile navigation around a central "Floating Action Button" (FAB) architecture.
4. **Component Decoupling**: Break down massive layout files (like the 600-line `Messaging.tsx`) into specialized, single-responsibility components (`ConversationList`, `ChatThread`, `Composer`).
