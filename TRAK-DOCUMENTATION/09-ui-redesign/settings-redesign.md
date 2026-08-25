# Settings Redesign

This document captures the structural and functional changes made to the Settings view (`/settings`) during the redesign phase.

## Original UI
Prior to the redesign, the Settings page was effectively a placeholder. It contained a simple heading and a paragraph reading: *"Account, notification and security settings land here in a later phase."* There were no actual user controls, as all styling was hardcoded and user management (passwords, profiles) was handled either manually by DB seeding or implicitly on the first login.

## Redesign Objectives
1. **Theme Controls**: Provide a user-facing interface to interact with the newly engineered `ThemeContext` (Light / Dark / System).
2. **Server-Side Rendering (SSR) Architecture**: Prepare the settings page for secure, data-bound forms (like password resets) by transitioning it from a Client Component to a Server Component.
3. **Security Enhancements**: Introduce a UI for changing default unit passwords.

## Changes Implemented

### Architectural Shift
The `settings/page.tsx` was refactored into a Next.js React Server Component. Client-side interactions were extracted into dedicated client components:
* `ThemeSettings.tsx`: Handles the radio buttons for selecting Light, Dark, or System themes, and interfaces with the `ThemeContext`.
* `DefaultPasswordForm.tsx`: A new form designed to allow users to update their credentials securely.

### Visual Polish
The components were constructed using the new semantic design tokens:
* Elevated containers using `bg-surface` and `border-border`.
* Form inputs utilizing `focus:ring-primary` for accessibility.
* Typography utilizing `text-muted-foreground` for helper text.

## Current State
The settings page now serves as the functional command center for the semantic UI redesign, allowing users to toggle and preview Dark Mode directly. The work is currently staged in the `sync-main` branch.
