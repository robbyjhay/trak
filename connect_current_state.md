# TRAK Connect Current-State Reconstruction

## A. Executive Summary
The Connect page is currently integrated into the TRAK application as a split-pane layout (on desktop) featuring a conversation list and an active thread view. It supports Community Chat, Broadcasts (for Unit Heads/Secretaries), Direct Messages, and Call Logs. Rather than possessing a complex independent navigation, it sits inside the global TRAK shell, functioning as a top-level route alongside Dashboard, Activities, and Settings. It provides a straightforward, optimistic-rendered messaging experience without heavy realtime presence indicators like "typing" or "read receipts" currently implemented in the UI.

## B. Route & File Structure
Connect exists in its own route group `(connect)` within the main `(app)` shell, separating its layout from the rest of the application's `(shell)` group.

```text
RootLayout (src/app/layout.tsx)
└── AppLayout (src/app/(app)/layout.tsx)
    └── ConnectLayout (src/app/(app)/(connect)/layout.tsx)
        ├── MessagesPage (src/app/(app)/(connect)/messages/page.tsx)
        └── ContactsPage (src/app/(app)/(connect)/contacts/page.tsx)
```

## C. Global TRAK Shell
Connect is wrapped by the global TRAK shell. 
- **Desktop Navigation**: A persistent Rail on the left side (`w-rail`, ~72-80px width) containing icons for Dashboard, New Activity, Activities, Responsibilities, Connect, and Settings.
- **Topbar**: A sticky header (88px height) spanning the remaining width, containing the user greeting, Connect tabs (on desktop), notifications bell, and a user profile dropdown chip.
- **Mobile Navigation**: A bottom navigation bar (`<MobileNav />`) that appears on mobile.
- **Connect Space**: Connect occupies the remaining viewport (`h-[calc(100dvh-88px)]`).

```text
GLOBAL NAV + CONNECT CONTENT
```

## D. Desktop Layout

```text
┌──────┬───────────────────────────────┬─────────────────────────────────────────────┐
│ TRAK │ Topbar (Greeting, Notifications, Profile)                                   │
│ RAIL ├───────────────────────────────┬─────────────────────────────────────────────┤
│      │ Search conversations...       │ < Community Chat            [Wipe] (if auth)│
│ [T]  ├───────────────────────────────┼─────────────────────────────────────────────┤
│      │ [Community Icon] Comm. Chat   │                                             │
│ dash │ [Broadcast Icon] Broadcast    │  [User A]                                   │
│ add  │ DIRECT MESSAGES               │  Message text...                 09:41 AM   │
│ list │ [User A] Say hello...         │                                             │
│ resp │ [User B] On call...           │                                  [Me]       │
│ conn │                               │                                  Hello!     │
│      │                               │                                             │
│      │                               │                                             │
│      │                               ├─────────────────────────────────────────────┤
│ set  │                      [+]      │ [+] [ Input...                  ] [Mic] [>] │
└──────┴───────────────────────────────┴─────────────────────────────────────────────┘
```
*Approximate Proportions*: 
- Global Nav (Rail): ~72px (fixed)
- Conversation List: 340px (fixed on desktop)
- Active Thread: Flexible (remaining width)

## E. Tablet Layout
On tablet, the Rail remains, but the space is slightly tighter. The layout is mostly identical to desktop (split pane).

```text
┌──────┬─────────────────────────┬─────────────────────────────────────┐
│ TRAK │ Topbar                                                        │
│ RAIL ├─────────────────────────┬─────────────────────────────────────┤
│      │ Search...               │ < Community Chat                    │
│      ├─────────────────────────┼─────────────────────────────────────┤
│      │ [Community]             │ Messages...                         │
│      │ [User A]                │                                     │
│      │ [User B]                │                                     │
│      │                         ├─────────────────────────────────────┤
│      │                 [+]     │ [+] [ Input...          ] [Mic] [>] │
└──────┴─────────────────────────┴─────────────────────────────────────┘
```

## F. Mobile Layout
On mobile, the Rail disappears, and a bottom navigation bar (`MobileNav`) appears. Connect operates in a mutually exclusive pane mode: either the Conversation List is visible, or the Active Thread is visible. The Topbar houses the ConnectTabs ("Messages" / "Contacts") beneath it.

**List View:**
```text
┌──────────────────────────────────────────────┐
│ Topbar (Greeting, Notifs, Profile)           │
├──────────────────────────────────────────────┤
│          [ Messages ] [ Contacts ]           │
├──────────────────────────────────────────────┤
│ Search conversations...                      │
├──────────────────────────────────────────────┤
│ [Community] Community Chat                   │
│ [User A] Say hello...                        │
│ [User B] Say hello...                        │
│                                              │
│                                          [+] │
├──────────────────────────────────────────────┤
│ [Dash] [Add] [List] [Resp] [Conn] [Settings] │
└──────────────────────────────────────────────┘
```

**Thread View (Overlay):**
```text
┌──────────────────────────────────────────────┐
│ < [Avatar] User A            [Phone] [WA]    │
├──────────────────────────────────────────────┤
│                                              │
│ [User A]                                     │
│ Message...                                   │
│                                              │
│                                      [Me]    │
│                                      Hi!     │
│                                              │
├──────────────────────────────────────────────┤
│ [+] [ Input...                   ] [Mic] [>] │
└──────────────────────────────────────────────┘
```

## G. Connect Component Tree
```text
MessagesPage (src/app/(app)/(connect)/messages/page.tsx)
└── Messaging (src/components/messaging/Messaging.tsx)
    ├── ConvItem (Conversation List Item)
    ├── BackBtn (Mobile back button)
    ├── CallPanel (Active call UI)
    ├── CallPill (In-thread call log)
    ├── Bubble (Message rendering)
    ├── ThreadScroll (Message timeline container)
    ├── Composer (Input, Attach, Mic, Send)
    ├── NewConversation (Modal for new chats)
    └── AddMember (Modal)
```

## H. Conversation List
- **Current Behavior**: Renders a search input (client-side filter not visibly wired to state in the snippet, just UI). Lists "Community Chat", "Broadcast" (if authorized), and a list of "Direct Messages" based on users in the system and existing DMs.
- Active state is styled distinctively.
- Displays snippets of the latest message or call duration/status.
- A floating action button (FAB) `[+]` sits in the bottom right to start a new conversation.

## I. Active Chat
- **Header**: Shows a `< Back` button on mobile. Shows Avatar, Name, Role, Username. Includes action buttons to start a Phone Call or open WhatsApp. For Community Chat, shows a "Wipe" button if authorized.
- **Scroll Area**: Displays a chronological list of messages and call logs. Shows "No messages yet — say hello." if empty.
- **Call Panel**: If an active call is ongoing with the partner, the thread area is replaced by `<CallPanel />`.

## J. Message Rendering
- **Incoming**: Aligned left, gray background (`bg-surface-muted`), shows sender's first name, text, and timestamp.
- **Outgoing**: Aligned right, primary color background (`bg-aztec-3` or similar), shows text and timestamp.
- **Call Logs**: Renders as a `<CallPill />` showing "You called" or "Incoming call", duration, and timestamp.
- **Grouping**: Minimal grouping; every incoming bubble shows the avatar and name.

## K. Composer
- **Input**: Multiline/text input (`<input type="text">`).
- **Buttons**: Attach file `[+]`, Voice message `[Mic]`, Send `[>]`. (Attach and Voice are currently UI-only/placeholders).
- **Behavior**: Hitting Enter triggers `onSend`. Clears input on optimistic send.

## L. Interactions
- **Click Conversation**: `setActiveConv(id)`, sets `mobilePane="thread"` (triggering mobile overlay).
- **Send Message**: Optimistic local state update (clears input), calls `sendDm()` or `sendCommunity()` which handles API/realtime.
- **Phone Button**: Triggers `startCall(p.id)` from `CallContext`.
- **WhatsApp Button**: Opens external `https://wa.me/...` link.
- **Wipe Community**: Opens confirmation banner in Community Chat header.

## M. Responsive Behavior
- **Desktop (md+)**: Split pane (`flex`). Rail on the left. ConnectTabs inside Topbar.
- **Mobile (< md)**: Single pane view. Topbar stacks tabs below it. Tapping a conversation changes state to `"thread"`, hiding the list and showing the thread fullscreen (`fixed inset-0 z-[100]`), completely hiding the underlying list and the global navigation when a thread is open.

## N. Backend / Realtime Architecture
- **Prisma Models**: `DirectMessage`, `CommunityMessage`, `CommunityMessageMention`, `Broadcast`, `CallRecord`.
- **Realtime**: State is managed globally via `TrakStore` (`src/context/TrakStore.tsx`) which likely hooks into a realtime service or polling to update `db.dms` and `db.community`.

```text
React Connect UI (Messaging.tsx)
       │
       ├── TrakStore (Context)
       │
       ├── CallContext (Signaling/WebRTC state)
       │
    Backend (Next.js Actions / Route Handlers)
       │
    Prisma (DirectMessage, CommunityMessage, CallRecord)
       │
    PostgreSQL
```

## O. UI-Redesign Branch Changes
The `ui-redesign` branch (and current local uncommitted changes on `sync-main`) introduces semantic Tailwind design tokens to replace hardcoded colors.
- `bg-white` -> `bg-surface`
- `border-line` -> `border-border`
- `text-ink` -> `text-foreground`
- `bg-neutral-bg` -> `bg-surface-muted`
- `bg-aztec-2` -> `bg-surface-interactive`
- Added transitions and hover states (`hover:bg-surface-hover`).
- No fundamental layout structural changes to Connect; strictly visual token replacements.

## P. Current Feature Matrix

| Feature | Current UI | Backend Support | Status |
| :--- | :--- | :--- | :--- |
| Direct messaging | Yes | `DirectMessage` model | IMPLEMENTED |
| Community chat | Yes | `CommunityMessage` model | IMPLEMENTED |
| Broadcasts | Yes | `Broadcast` model | IMPLEMENTED |
| Call signaling/UI | Yes | `CallRecord` model / `CallPanel` | IMPLEMENTED |
| Typing indicators | No | Unknown | NOT IMPLEMENTED |
| Read receipts | No | None in schema | NOT IMPLEMENTED |
| Reactions | No | None in schema | NOT IMPLEMENTED |
| Attachments | UI button only | No explicit schema link to messages | UI EXISTS / BACKEND INCOMPLETE |
| Voice notes | UI button only | No explicit schema link to messages | UI EXISTS / BACKEND INCOMPLETE |

## Q. Current Connect Wireframe

**Desktop (Consolidated):**
```text
┌──────┬───────────────────────────────┬─────────────────────────────────────────────┐
│ TRAK │ Topbar (Greeting, ConnectTabs, Notifs, Profile)                             │
│ RAIL ├───────────────────────────────┬─────────────────────────────────────────────┤
│      │ Search conversations...       │ < [Avatar] John Doe            [Phone] [WA] │
│      ├───────────────────────────────┼─────────────────────────────────────────────┤
│      │ [Community] Comm. Chat        │                                             │
│      │ [Broadcast] Broadcast         │  [John Doe]                                 │
│      │ DIRECT MESSAGES               │  Hey, are you free for a call?   09:41 AM   │
│      │ [John] On call...             │                                             │
│      │ [Jane] Say hello...           │                                  [Me]       │
│      │                               │                                  Yes, ring! │
│      │                               │                                             │
│      │                               ├─────────────────────────────────────────────┤
│      │                      [+]      │ [+] [ Message John...           ] [Mic] [>] │
└──────┴───────────────────────────────┴─────────────────────────────────────────────┘
```

**Mobile (Consolidated):**
```text
┌──────────────────────────────────────────────┐
│ < [Avatar] John Doe            [Phone] [WA]  │
├──────────────────────────────────────────────┤
│                                              │
│ [John Doe]                                   │
│ Hey, are you free for a call?     09:41 AM   │
│                                              │
│                                      [Me]    │
│                                      Yes!    │
│                                              │
├──────────────────────────────────────────────┤
│ [+] [ Message John...            ] [Mic] [>] │
└──────────────────────────────────────────────┘
```

## R. Important Observations
1. **Connect lives *inside* TRAK**: It does not have an independent shell; it relies on the global Rail (desktop) and Topbar.
2. **Optimistic Rendering**: The composer relies on `sendDm()` returning a promise and immediately clearing the input, suggesting standard optimistic updates in `TrakStore`.
3. **Responsive Implementation**: Mobile uses a boolean-like state (`mobilePane: "list" | "thread"`) to toggle between the conversation list and the active chat using a full-screen fixed overlay (`fixed inset-0 z-[100]`), completely hiding the underlying list and the global navigation when a thread is open.
4. **Placeholder Features**: The Attach `[+]` and Voice Note `[Mic]` buttons in the composer are currently dead UI elements (no `onClick` handlers or file inputs attached).
5. **Calls**: Connect is heavily integrated with a custom calling system (`CallContext`), rendering both active call panels and historic call duration pills within the message stream.
