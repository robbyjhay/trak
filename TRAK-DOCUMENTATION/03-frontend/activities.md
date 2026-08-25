# Activities & Activity Detail

## Activities List
**Page:** Activities
**Route:** `/activities`

### Purpose
To display a comprehensive, filterable list of all activities assigned to or created by the user. 

### Prototype Origin
**Classification:** A — Directly derived from original prototype.

**Prototype intent:**
Known in the prototype as "My Activities" or "Person Activities," it was a tabbed list separating Pending, Completed, and Missed tasks.

**Development evolution:**
The core intent remains exactly the same. The primary change was moving from an in-memory array filter to a Prisma database query leveraging the `ActivityStatus` enum. It was also updated to distinguish between activities created *by* the user and activities *delegated* to them by the Head.

---

## Activity Detail
**Page:** Activity Detail
**Route:** `/activity/[id]`

### Purpose
The most complex data-entry page in the application. It allows users to log the day-by-day progress of an activity, capture evidence, dictate transcripts, and wrap up the task for review.

### Prototype Origin
**Classification:** B — Originally proposed but significantly changed.

**Prototype intent:**
The prototype defined a "stepper" flow where users would log objectives, click a button to record voice transcripts (via `SpeechRecognition`), upload files, and log budget spending.

**Development evolution:**
The frontend UI (stepper flow, transcript recorder) closely matches the prototype. However, the backend complexity increased massively. 
* Daily logs are now stored as independent `DailyLog` relational records attached to the `Activity`.
* File uploads (evidence/invoices) are now handled by AWS S3 (`Attachment` model) instead of temporary blob URLs.
* The RSVP link generation now creates a secure token backed by the database rather than relying on `localStorage` cross-tab relays.

### Main UI & Important Components
* **Day Stepper**: Navigates between the days of a multi-day activity.
* **Voice Recorder**: A custom component interfacing with the browser's Media/Speech APIs to generate transcripts.
* **Budget Table**: Dynamic inputs for itemized spending.
* **Attendance Tracker**: UI for manual entry and RSVP link generation.

### Backend & Database Dependencies
* Heavily relies on the `Activity`, `DailyLog`, `Attendee`, and `Attachment` Prisma models.
* Relies on specific API routes (`/api/activities/[id]/logs`) to handle the complex mutations required for daily logging and file uploads.
