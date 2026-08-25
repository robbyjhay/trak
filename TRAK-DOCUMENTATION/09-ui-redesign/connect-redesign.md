# Connect Redesign

This document outlines the architectural and visual changes applied to the Connect (Messaging) suite during the redesign phase.

## Original UI
The original Connect interface (implemented prior to the `ui-redesign` branch) was a monolithic 600+ line component (`Messaging.tsx`). It managed the conversation list, the active chat thread, the composer input, and the WebRTC call panel in a single file. 

Visually, it relied on hardcoded utility colors (e.g., `bg-neutral-bg`, `bg-aztec-2`), which prevented the chat interface from rendering correctly in Dark Mode.

## Redesign Objectives
1. **Component Decoupling**: Split the monolithic `Messaging.tsx` into single-responsibility components to improve maintainability and React rendering performance.
2. **Semantic Theming**: Ensure chat bubbles, active states, and backgrounds use theme-aware tokens.
3. **Mobile Overlay**: Refine the mutually exclusive pane behavior on mobile screens.

## Changes Implemented

### Component Architecture
The massive `Messaging.tsx` file is actively being disassembled. New specialized components were introduced:
* `ConversationList.tsx`: Handles the left-hand directory of DMs, Community Chat, and Broadcasts.
* `ChatThread.tsx`: Handles the rendering of message bubbles and call logs.
* `Composer.tsx`: Handles the input field, optimistic UI updates, and WebSocket dispatching.

### Visual Redesign
* **Theme Tokens**: Hardcoded colors were systematically replaced.
  * `bg-white` → `bg-surface`
  * `border-line` → `border-border`
  * `text-ink` → `text-foreground`
  * `bg-neutral-bg` (Incoming messages) → `bg-surface-muted`
  * `bg-aztec-2` (Outgoing messages / Active states) → `bg-surface-interactive` or `bg-primary` variants.
* **Hover States**: Introduced explicit hover states (`hover:bg-surface-hover`) for conversation list items to improve desktop ergonomics.

## Clarification on Mock Features
It is important to note that the *UI Redesign* does not encompass adding *backend functionality*. The Connect UI currently features UI elements (such as an Attachment `[+]` button and a Voice Note `[Mic]` button in the Composer, as well as visual space for Typing Indicators) that are purely visual placeholders. The redesign updates the styling of these elements to match the new token system, but they remain non-functional pending future backend implementation.

## Current State
The Connect redesign is currently **In Progress** as part of the uncommitted work on the `sync-main` branch, representing the largest single refactor of the UI redesign phase.
