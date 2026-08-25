# Prototype 1 Analysis

Based on the historical source document `Trakprototype.txt`.

## Product Concept
Trak was originally conceived as an in-browser digital learning unit tracking tool. Its primary goal was to replace manual tracking of daily logs, attendance, and activity reports with a seamless digital system. It was targeted at the members of the PSSDC Digital Learning Unit.

The core workflow envisioned a single-page application where users log in, create activities linked to specific unit responsibilities, log daily progress (including voice transcripts and evidence), and ultimately generate a standardized Word document report.

## User Roles
* **Head of Unit (e.g., Babajide)**: The manager. Has access to an "Accounting Officer" dashboard to view unit-wide KPIs, delegate tasks, edit team profiles, and send broadcasts.
* **Secretary**: A member with elevated privileges to send unit-wide broadcasts.
* **Member / NYSC Corps Member**: Can create activities, log progress, self-service their profile (including a webcam selfie capture), and participate in messaging.

## Originally Proposed Features
* Activity creation and tracking (Meeting, Project, Program, Task).
* Daily logs with objectives, text descriptions, and voice-to-text transcript recording.
* Attendance tracking via manual entry or a base64url encoded RSVP link.
* Automatic HTML-to-Word report generation.
* Notifications (in-app and OS-level via Notification API).
* Real-time Dashboards with KPIs and progress bars.
* Basic messaging ("Connect") with Community Chat, Direct Messages, and Unit-wide Broadcasts.

## Pages & UI
* **Routing**: Hash-based routing (`#/dashboard`) inside a Single Page Application modifying `innerHTML`.
* **Pages**: Login (roster-based quick select), My Profile, Member Dashboard, Head Dashboard (Accounting Officer), My Activities, New Activity, Activity Detail, RSVP Form, Connect (Messages/Contacts), Report Preview modal.
* **UI**: Sticky left rail, topbar, modal dialogs, KPI cards. Colors relied on CSS variables (Aztec, Saffron, Paper).

## Technical Requirements (Prototype)
The prototype was entirely frontend-focused:
* Vanilla HTML, CSS, and JavaScript. No modern framework like React.
* Data was stored in-memory using JavaScript objects (`DB.activities`).
* Depended on browser APIs: `SpeechRecognition` (Web Speech API), `getUserMedia` (WebRTC for selfies), `URL.createObjectURL` for downloading reports.
