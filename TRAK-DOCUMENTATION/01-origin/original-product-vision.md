# Original Product Vision

## What was TRAK originally supposed to be?

TRAK was originally conceived as a bespoke, in-browser "digital learning unit tracking tool" for the Lagos State Government PSSDC Digital Learning Unit. 

Before the Next.js architecture, the PostgreSQL database, or the WebSocket server existed, TRAK was defined strictly as a frontend-only prototype designed to solve a very specific administrative problem: **the manual, paper-based tracking of unit activities, daily logs, attendance, and reporting.**

The original vision (as captured in the prototypes) was an application where:
1. **Members** (Instructional Designers, Content Officers, NYSC Corps Members) could digitally log the objectives and progress of their assigned activities (Meetings, Projects, Tasks).
2. **Execution** could be documented in real-time, relying heavily on browser APIs like `SpeechRecognition` to dictate meeting transcripts and `getUserMedia` to snap evidence photos or selfies.
3. **Administration** was automated. Instead of manually typing up a post-activity report, the application would aggregate the daily logs, budget spending, and attendance (gathered via shareable RSVP links) and instantly generate a formatted A4 Microsoft Word `.doc` file.
4. **Oversight** was centralized. The Head of Unit (specifically noted as "Babajide" in the prototype context) could view unit-wide KPIs, completion rates, and individual performance from an "Accounting Officer" dashboard.

### The Prototype Constraints
The original vision was constrained by its nature as a prototype. It was a Single Page Application built with Vanilla HTML, CSS, and JavaScript. 
* There was no real authentication; users clicked a face on a roster to "log in."
* There was no real database; everything lived in temporary JavaScript memory.
* There was no real real-time communication; the "Connect" messaging interface was a visual simulation.

Despite these technical limitations, the *product vision* was complete. The prototypes successfully defined the routing structure, the "Aztec" dark green visual identity, the core data models (Activities, Daily Logs, Users, Messages), and the exact workflow that the final application would need to support.

The journey from this original vision to the current application is the process of taking this static, in-memory blueprint and backing it with a robust, secure, and production-ready server architecture, while adapting the UI to modern component-based frameworks.
