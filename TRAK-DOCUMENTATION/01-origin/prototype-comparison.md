# Prototype Comparison

An analysis of how the application concepts evolved from Prototype 1 (`Trakprototype.txt`) to Prototype 2 (`Trakprototype (3).txt`).

| Area | Prototype 1 | Prototype 2 | What Changed |
| :--- | :--- | :--- | :--- |
| **Product concept** | Digital learning unit tracking tool for activities and reporting. | Same core concept, but matured into a more robust operations register capable of offline PWA installation. | The scope expanded from purely activity tracking to include financial tracking and mobile readiness. |
| **User roles** | Head, Secretary, Member, NYSC. | Head, Secretary, Member, NYSC. | Roles remained identical, but NYSC members explicitly gained a `corpsEnd` tracking date. |
| **Dashboard** | Member KPIs, weekly charts, and Head "Accounting Officer" view. | Similar layout, but Head dashboard evolved into a more formal "Admin Portal" with unit-wide feeds and performance rankings. | The Head's view became more focused on aggregate oversight rather than just a secondary tab. |
| **Activities** | Multi-day logging, objectives, text, voice transcripts, attachments. | Added an integrated Budget & Spending tracker with itemized lists. | Activity detail grew from a simple form to a comprehensive stepper flow including financial reporting. |
| **Communication** | Connect module with Community Chat, Broadcasts, and DMs. | Connect module gained @mentions and reply-quotes in Community Chat. | Incremental UI and UX improvements to make the chat feel more like a modern messenger. |
| **Authentication** | Quick-select roster (no passwords, mock login). | Quick-select roster with mock password entry. | Slight step toward realism, though still an insecure mock implementation. |
| **Database** | In-memory JavaScript object (`DB`). | In-memory JavaScript object (`DB`), but utilizing `localStorage` to relay RSVP data. | Introduction of browser storage as a makeshift persistence/communication layer. |
| **UI** | Flexbox, Aztec/Saffron theme, Fraunces/Archivo fonts. | Mostly identical, with refined components (steppers, badges, live preview cards). | The design system stabilized; Prototype 2 served as the definitive UI blueprint. |
| **Mobile** | Responsive grid adjustments. | Explicit Progressive Web App (PWA) requirements for offline installation. | A clear shift toward treating the application as a mobile-first tool for members on the go. |
| **Settings / Profile** | Profile page with WebRTC selfie capture. | Profile page with notification settings. | Minor feature parity additions. |
| **Security** | None (mock). | None (mock). | No changes. |
| **Future features** | Real backend integration implied. | PWA Service Workers implied. | The prototype reached the absolute limit of what could be achieved without a real backend. |

## Conclusion
Prototype 2 represents a refinement and expansion of Prototype 1, rather than a completely new direction. It solidified the visual language, added crucial operational features (budgets), and set the stage for mobile installation (PWA). It acts as the final "blueprint" before actual full-stack development began.
