# Responsive & Mobile Redesign

This document captures the evolution of TRAK's responsive behavior, specifically focusing on mobile ergonomics introduced during the redesign phase.

## Original UI Limitations
The original React implementation of TRAK treated mobile viewports as an afterthought. It utilized a "squash and stack" responsive philosophy:
* The desktop left rail (`Rail.tsx`) simply disappeared on `md` screens.
* The Dashboard cards wrapped into a single column.
* A standard, flat bottom navigation bar (`MobileNav.tsx`) appeared, cramming 6 small icons into a tight horizontal row.
* The Connect layout (`Messaging.tsx`) used a simple `display: none` toggle to switch between the conversation list and the active thread.

The result was functional but lacked the ergonomic affordances expected of a modern web application or PWA.

## Redesign Philosophy: Mobile-First Ergonomics
The `ui-redesign` phase shifted the philosophy from "squashed desktop" to purposeful mobile engineering.

### 1. The Mobile Navigation Scoop
The most significant mobile decision was abandoning the flat bottom bar. 
* **The FAB**: Recognizing that "New Activity" is the primary action for on-the-go users, it was elevated into a prominent Floating Action Button (FAB).
* **The Scoop Background**: Instead of floating the button over content, an SVG-driven `<ScoopBackground>` component was engineered. This dynamically renders a geometric "cutout" in the bottom bar, cradling the FAB. This mimics the visual language of native iOS and Android applications.

### 2. Dashboard Layout
Instead of simply stacking identical KPI cards on mobile, the redesigned `MemberDashboard` utilizes an asymmetrical CSS Grid. 
* On desktop, the metrics sit in a complex row-spanning arrangement.
* On mobile, the grid collapses intelligently, ensuring the massive "Completed this month" metric remains the dominant focal point at the top of the screen, rather than getting lost in a long scrollable column.

### 3. Connect Mobile Overlay
The massive 600-line `Messaging.tsx` component is currently being decoupled. Part of this refactor (handled by `useConnectNav`) involves refining how the mobile pane switches between the `ConversationList` and the active `ChatThread`. Instead of a jarring `display: none` CSS toggle, the architecture is being prepared to support smoother transition states and explicit "Back" button handling for mobile browsers.

## Current State
The mobile redesign (specifically the SVG Navigation Scoop and the Dashboard Grid) is fully implemented in the `ui-redesign` and `sync-main` branches. The Connect mobile pane behavior is currently actively being refactored.
