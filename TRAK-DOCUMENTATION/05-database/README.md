# Database Documentation

This section documents the database schema and architecture used by TRAK.

The application uses **PostgreSQL** as its relational database, with **Prisma** (v7.9.1) acting as the ORM.

## Schema Overview

The database is structured to support the core domain requirements that evolved from the initial prototypes, alongside a robust authentication and security layer added during production hardening.

### 1. Authentication & Account (Phase 0)
The foundation of the database, handling secure access and user metadata.
* `User`: The core identity model. Handles credentials (`passwordHash`), role (`UserRole`), and active status.
* `UserProfile`: Stores HR-related metadata (name, designation, grade level, corps status).
* `Session`: Manages active login sessions, tracking user agents and IP addresses for security.
* `AuthToken`: Handles temporary, secure tokens for password resets and invitations.
* `UserPreferences`: Stores user-specific settings (notifications, locale, timezone).
* `AuditEvent`: A security log tracking critical actions (login, password change, user creation).

### 2. Domain (Phase 1+)
The implementation of the original prototype's tracking concepts.
* `Activity`: The primary work item (Meeting, Project, Program, Task). Tracks dates, budget estimates, and high-level outcomes.
* `Responsibility`: The official unit-defined tasks that activities fall under.
* `ActivityResponsibility`: A join table linking an activity to its categorized responsibilities.
* `DailyLog`: The granular, day-by-day record for an activity. Stores objectives, transcripts, and financial spending.
* `Attendee`: Records of individuals who attended a specific `DailyLog`.
* `Attachment`: Metadata for files (evidence/invoices) uploaded to AWS S3.
* `Comment`: Remarks left by the Head of Unit on completed activities.

### 3. Messaging & Realtime (Phase 2)
The data structures backing the "Connect" communication suite.
* `DirectMessage`: Peer-to-peer text messages.
* `CommunityMessage`: Unit-wide chat messages, supporting replies and mentions.
* `Broadcast`: One-way announcements from administrators.
* `CallRecord`: Historical logs of WebRTC calls between users.
* `Notification`: System-generated alerts for users (mentions, activity updates).

### 4. Global Settings
* `UnitSettings`: Global configurations for the organization (e.g., default passwords).

## Migrations
The database is version-controlled using Prisma Migrate. The initial development history is visible in the migration files:
* `20260810105603_phase0_auth_foundation`
* `20260810144147_audit_events`
* `20260810155605_phase1_domain_tables`
* `20260819141026_unit_settings`
* `20260820135229_add_intern_flag`
