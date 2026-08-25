# Theme System

This document explains the architecture and implementation of TRAK's theme management capabilities introduced during the UI redesign.

## Original State
Before the redesign branch, TRAK had no proper theme support. The UI was locked into a "Light Mode" utilizing the "Paper" (off-white) background. A hack existed in `globals.css` that attempted an alias override (`--paper: var(--aztec)`), but it was incomplete, triggered automatically by OS settings without user control, and broke many specific UI elements.

## Redesign Implementation
The redesign introduces a first-class React context for theme management, located in `src/context/ThemeContext.tsx`.

### Supported Themes
The system explicitly supports three states:
* `light`: Forces the Light semantic tokens.
* `dark`: Forces the Dark semantic tokens.
* `system`: Reads the `window.matchMedia("(prefers-color-scheme: dark)")` OS-level preference.

### Theme Architecture
* **State Management**: The context tracks both the active `theme` (the saved preference) and a `preview` state (used when the user is hovering over options in the Settings menu before explicitly saving).
* **Storage**: The preference is durably stored in the browser using `localStorage.setItem("trak-theme")`.
* **DOM Injection**: A `useEffect` hook listens to the `preview` state and dynamically injects or removes the `.light` or `.dark` class directly on the `window.document.documentElement` (`<html>` tag). This triggers the CSS variable swap defined in `globals.css`.

## Current State
The underlying architecture is fully implemented. The `ThemeContext` provides the `setTheme`, `saveTheme`, and `cancelPreview` functions required to build a robust Settings UI.

## Remaining Work
* **Component Migration**: While the context is active, many components throughout the application still contain the old hardcoded Tailwind classes (e.g., `text-ink`, `bg-aztec`). These components will appear broken or illegible when Dark Mode is toggled until they are refactored to use semantic tokens (`text-foreground`, `bg-surface`).
* **Database Persistence**: Currently, the theme is only stored in `localStorage`. It needs to be wired to the `UserPreferences` Prisma model so that a user's theme preference roams across devices.
