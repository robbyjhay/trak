# Before vs After: Project Evolution

This high-level comparison demonstrates the architectural and feature evolution of TRAK from its initial prototype state to its current, production-hardened implementation.

| Area | Original State | Current State |
| :--- | :--- | :--- |
| **Frontend** | Pure Prototype / Text Spec | React + Next.js App Router |
| **State/Data** | Local/mock | PostgreSQL-backed |
| **Database** | Mutex-locked JSON file | PostgreSQL + Prisma ORM |
| **Authentication** | Prototype mock | Opaque Session Tokens (SHA-256 DB verification) |
| **Passwords** | Unsafe shared default (`DLUactsys360`) | Cryptographic hashing (`bcryptjs` cost 12) |
| **APIs** | Broad exposure (dumped full DB) | Scoped/authorized endpoints (`getScopedBootstrap`) |
| **Realtime** | Inefficient 30-second polling | WebSocket server powered by `ws` |
| **Scaling** | Single Node (JSON bound) | Multi-Node ready via Redis Pub/Sub |
| **Calling** | Prototype concept | WebRTC signaling integrated into WS Server |
| **Storage** | Local browser Blob URLs | AWS S3 SDK for object storage |
| **Testing** | Non-existent | Automated Vitest (Unit) and Playwright (E2E) |
| **Production Validation** | Manual / Assumed | Explicit fail-closed environment gate script |
| **UI** | Prototype-oriented (hardcoded) | Decoupled semantic components |
| **Theme** | Locked to Light Mode brand colors | Dynamic Theme/Token architecture (Dark/Light) |
| **Mobile Experience**| Squashed desktop view | Purpose-built FAB and SVG scoop navigation |
