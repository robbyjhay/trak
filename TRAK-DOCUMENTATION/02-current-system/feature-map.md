# Feature Map

A comprehensive inventory of features currently identified in the TRAK codebase and their implementation status.

## Authentication & Accounts
* **Session-based Login**: Implemented (JWT cookies, `bcrypt` password hashing).
* **Role-Based Access Control (RBAC)**: Implemented (`head`, `member`, `isSecretary`, `isCorps`).
* **Password Reset/Change**: Implemented (Requires initial password change).
* **Self-registration**: Deprecated/Not implemented (Accounts are provisioned by unit admins).
* **Profile Management**: Implemented (Name, designation, unit metadata).
* **Selfie Capture (WebRTC)**: Visual-only / Partially implemented (Hook `useSelfieCapture.ts` exists, but lacks robust avatar storage pipeline beyond mock).

## Activity Management
* **Activity Creation**: Implemented (Meeting, Project, Program, Task).
* **Activity Dashboard**: Implemented (Role-aware views for Head vs Member).
* **Multi-day Logging**: Implemented (Granular day-by-day objectives and updates).
* **Voice Transcription**: Implemented (Browser `SpeechRecognition` API via `useSpeechRecognition.ts`).
* **File Uploads (Evidence)**: Implemented (AWS S3 presigned URLs via `storage.service.ts`).
* **Budget Tracking**: Implemented (Itemized JSON spending items and amounts).
* **Report Generation**: Implemented (HTML-to-Word generation via `buildReport.ts`).

## Attendance
* **Manual Registration**: Implemented (Unit member selection and manual entry).
* **Public RSVP Links**: Implemented (Database-backed token verification via `/api/rsvp`).

## Connect (Messaging & Realtime)
* **WebSockets**: Implemented (Custom `server.ts` running alongside Next.js).
* **Direct Messages**: Implemented.
* **Community Chat**: Implemented.
* **Broadcasts**: Implemented (Restricted to Head and Secretary).
* **Typing Indicators**: Visual-only / Not implemented (Missing backend state).
* **Read Receipts**: Not implemented (No schema support).
* **Message Attachments**: Visual-only / Not implemented (UI buttons exist, backend incomplete).
* **Message Voice Notes**: Visual-only / Not implemented (UI buttons exist, backend incomplete).
* **WebRTC Calling**: Implemented (Full signaling loop: offer, answer, ICE candidates).

## UI & Settings
* **Theme System (Light/Dark)**: Partially implemented (Active WIP in `ui-redesign` branch via `ThemeContext`).
* **Responsive Navigation**: Implemented (Rail on desktop, MobileNav on mobile).
* **Push Notifications**: Visual-only / Not implemented (Notification models exist, but OS-level Web Push is not wired).
