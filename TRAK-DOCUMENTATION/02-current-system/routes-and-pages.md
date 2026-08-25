# Routes and Pages Map

This document maps all the discovered pages within the TRAK Next.js App Router implementation.

## 1. Dashboard
**Page**: Dashboard
**Route**: `/dashboard`
**Purpose**: Primary landing page providing an overview of workload and unit performance.
**Origin**: Evolved from Prototype 1's split view.
**Users**: All authenticated users.
**Permissions**: UI branches based on `head` vs `member` role.
**Main components**: `HeadDashboard`, `MemberDashboard`, KPI cards.
**Backend dependencies**: Server Actions for data fetching.
**Database dependencies**: Aggregations on `Activity` and `User` models.
**Realtime dependencies**: None directly.
**Important interactions**: Links to create new activities or view existing ones.
**Current state**: Implemented.

## 2. Activities List
**Page**: Activities
**Route**: `/activities`
**Purpose**: Display a filterable list of activities.
**Origin**: Derived from Prototype 1.
**Users**: All authenticated users.
**Permissions**: Users see their own activities or those delegated to them.
**Main components**: `PersonActivities`, `ActRow`.
**Backend dependencies**: Server Actions.
**Database dependencies**: `Activity` model.
**Realtime dependencies**: None.
**Important interactions**: Filtering by status (Pending, Completed).
**Current state**: Implemented.

## 3. Activity Detail
**Page**: Activity Detail
**Route**: `/activity/[id]`
**Purpose**: The core day-by-day logging interface for tasks.
**Origin**: Derived from Prototype 2 (stepper flow).
**Users**: All authenticated users.
**Permissions**: Only the creator or delegated user can edit. Head can comment.
**Main components**: `ActivityDetail`, Voice Recorder, Budget Table.
**Backend dependencies**: `POST /api/activities/[id]/logs`.
**Database dependencies**: `Activity`, `DailyLog`, `Attachment`.
**Realtime dependencies**: None.
**Important interactions**: Voice transcription, file uploads.
**Current state**: Implemented.

## 4. New Activity
**Page**: New Activity
**Route**: `/new-activity`
**Purpose**: Creation flow for new activities.
**Origin**: Derived from Prototype 1.
**Users**: All authenticated users.
**Permissions**: Standard.
**Main components**: Form inputs, Live Preview Card.
**Backend dependencies**: Server Actions.
**Database dependencies**: `Activity`, `ActivityResponsibility`.
**Realtime dependencies**: None.
**Important interactions**: Form submission.
**Current state**: Implemented.

## 5. Messages (Connect)
**Page**: Messages
**Route**: `/messages`
**Purpose**: Realtime communication suite.
**Origin**: Derived from Prototype 1 / 2 Connect mockups.
**Users**: All authenticated users.
**Permissions**: Head/Secretary can Broadcast.
**Main components**: `Messaging`, `ConversationList`, `ChatThread`, `CallPanel`.
**Backend dependencies**: Custom WebSocket Server (`server.ts`).
**Database dependencies**: `DirectMessage`, `CommunityMessage`, `Broadcast`.
**Realtime dependencies**: Heavy reliance on WebSockets for delivery and WebRTC for calls.
**Important interactions**: Sending messages, starting calls.
**Current state**: Implemented (Visuals WIP in redesign).

## 6. Contacts (Connect)
**Page**: Contacts
**Route**: `/contacts`
**Purpose**: Directory of unit members to initiate DMs.
**Origin**: Prototype 1.
**Users**: All authenticated users.
**Permissions**: None.
**Main components**: User list.
**Backend dependencies**: Server Actions.
**Database dependencies**: `User` model.
**Realtime dependencies**: Online status indicators.
**Important interactions**: Clicking a user starts a DM.
**Current state**: Implemented.

## 7. Profile & Member Detail
**Page**: Profile / Member
**Route**: `/profile`, `/member/[id]`
**Purpose**: Personnel records and settings.
**Origin**: Prototype 1.
**Users**: All authenticated users.
**Permissions**: Users can edit their own profile; Head can view/edit others.
**Main components**: Profile forms, Selfie capture modal.
**Backend dependencies**: Server Actions.
**Database dependencies**: `UserProfile`.
**Realtime dependencies**: None.
**Important interactions**: Updating avatar.
**Current state**: Implemented.

## 8. Responsibilities
**Page**: Responsibilities
**Route**: `/responsibilities`
**Purpose**: Manage official unit responsibilities.
**Origin**: Prototype 2.
**Users**: Head of Unit.
**Permissions**: Restricted to `head` role.
**Main components**: `RespManageList`.
**Backend dependencies**: Server Actions.
**Database dependencies**: `Responsibility`.
**Realtime dependencies**: None.
**Important interactions**: CRUD operations on responsibilities.
**Current state**: Implemented.

## 9. Settings
**Page**: Settings
**Route**: `/settings`
**Purpose**: User preferences and theme configuration.
**Origin**: UI Redesign phase.
**Users**: All authenticated users.
**Permissions**: Standard.
**Main components**: `ThemeSettings`, `DefaultPasswordForm`.
**Backend dependencies**: Server Actions.
**Database dependencies**: `UserPreferences`, `UnitSettings`.
**Realtime dependencies**: None.
**Important interactions**: Toggling dark mode.
**Current state**: Implemented (WIP in redesign).

## 10. Authentication Flows
**Pages**: Login, Set Password, RSVP
**Routes**: `/login`, `/set-password`, `/rsvp/[encoded]`
**Purpose**: Entry points to the application.
**Origin**: Phase 4 Production Hardening.
**Users**: Public / Unauthenticated.
**Permissions**: None.
**Main components**: `LoginForm`, `SetPasswordForm`.
**Backend dependencies**: `/api/auth/login`, `/api/rsvp`.
**Database dependencies**: `User`, `Session`, `AuthToken`.
**Realtime dependencies**: None.
**Important interactions**: Credential validation, cryptographic token verification.
**Current state**: Implemented.
