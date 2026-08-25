# Connect

**Pages:** Messages, Contacts
**Routes:** `/messages`, `/contacts` (inside the `(connect)` route group)

## Purpose
Provides the real-time communication suite for the unit. It allows users to send direct messages, participate in a unit-wide community chat, receive broadcasts, and initiate WebRTC audio/video calls.

## Who can access it
All authenticated users. The Head and Secretary roles have elevated permissions to send "Broadcast" messages.

## Prototype Origin
**Classification:** B — Originally proposed but significantly changed.

**Prototype intent:**
Prototype 1 introduced "Connect" as a basic messaging UI with Community Chat, Broadcasts, and DMs. Prototype 2 expanded this conceptually to include @mentions and reply-quotes. However, in both prototypes, this was purely a visual simulation with no actual network capabilities.

**Development evolution:**
Connect is where the application diverged most heavily from a simple tracking tool into a complex real-time platform. 
* **Layout**: It was built as a split-pane layout integrated into the global TRAK shell, functioning as a top-level route. On mobile, it acts as a mutually exclusive pane (list vs. active thread overlay).
* **Realtime State**: A global `TrakStore` context was introduced to handle optimistic UI rendering and state management.
* **Calling**: A complete WebRTC signaling layer (`CallContext`, `CallPanel`) was built on top of the chat interface, which was not explicitly defined in the early prototypes but became a core feature.

## Main UI & Important Components
* **ConversationList**: The left-hand pane (or default mobile view) showing active DMs, Community Chat, and Broadcasts.
* **ChatThread**: The active conversation pane displaying message bubbles (`Bubble`).
* **Composer**: The input area for typing messages. Currently has UI placeholders for attachments and voice notes that are not yet wired to the backend.
* **CallPanel**: An overlay UI that appears when an active WebRTC call is initiated.

## Backend & Database Dependencies
* Relies on the `DirectMessage`, `CommunityMessage`, and `Broadcast` Prisma models.
* Relies on the custom WebSocket server (`server.ts`) for real-time message delivery and WebRTC signaling (offers, answers, ICE candidates).

## Current Status
Implemented and functional for text messaging and basic calling. Certain advanced UI features (typing indicators, read receipts, message attachments) are mocked in the UI but lack backend implementation. The UI is currently being updated in the `ui-redesign` branch to utilize semantic color tokens.
