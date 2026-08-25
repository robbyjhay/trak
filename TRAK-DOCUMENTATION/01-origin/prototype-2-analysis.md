# Prototype 2 Analysis

Based on the historical source document `Trakprototype (3).txt`.

## Product Concept
Trak continued to be an operations register for the PSSDC Digital Learning Unit. The core workflow remained intact: members create activities, log daily progress (including capturing transcripts via voice), upload evidence, and generate activity reports. However, Prototype 2 introduced deeper tracking mechanisms, particularly around budgets and offline capabilities.

## User Roles
* **Head of Unit**: Full oversight, reviews/comments on completed reports, delegates tasks, manages unit responsibilities, broadcasts messages.
* **Secretary**: Member with broadcast capabilities.
* **Member / NYSC Corps Member**: Core users for logging tasks, budgets, and attendance. NYSC members have a tracked end date (`corpsEnd`).

## Originally Proposed Features
* **Expanded Tracking**: Budget and spending tracker with itemized lists and invoice file attachments.
* **Enhanced Transcription**: Voice transcriber added auto-pausing, basic turn-taking heuristics, and punctuation commands.
* **PWA**: Progressive Web App manifest for offline-capable mobile installation.
* **Relay Storage**: Utilized `localStorage` as a durable relay to sync RSVP form submissions between browser tabs.
* **Messaging**: The "Connect" suite included @mentions and reply-quotes in Community Chat.

## Pages & UI
* **Pages**: Quick Select Login, Member Dashboard, My Activities, New Activity (with live preview card), Activity Detail (stepper flow for Pending, read-only for Completed), Admin Portal, Responsibilities list, Messaging, My Profile, RSVP Form.
* **UI Structure**: Flexbox shell with a sticky left navigation rail. Use of specific typographies (Fraunces for headings, Archivo for body, JetBrains Mono for numbers). Heavy use of the 'Aztec' (dark green) and 'Saffron' (yellow) color palette.

## Technical Requirements (Prototype)
* Still Vanilla HTML/CSS/JS with in-memory `DB` objects.
* Relied heavily on `localStorage` for cross-tab communication (specifically for the RSVP system).
* Designed for static file hosting but noted the requirement for an HTTPS origin for PWA Service Workers.
* `Web Speech API`, `WebRTC`, and `Notification API`.
