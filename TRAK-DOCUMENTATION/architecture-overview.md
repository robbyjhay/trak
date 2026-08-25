# Definitive Architecture Overview

This document provides a high-level technical map of the current TRAK application.

## System Architecture

```text
Browser Client
      │
      ├──────( HTTP / REST )──────┐
      │                           │
      ├──────( WebSockets )───────┼────────┐
      │                           │        │
      │                     [Next.js App]  │
      │                           │        │
      │                     [API Routes]   │
[AWS S3 Object Store]             │        │
                                  ▼        ▼
                          [Auth & Validation Middleware]
                                  │        │
                                  ▼        ▼
                              [Prisma ORM] └─── [server.ts (Node/WS)]
                                  │                    │
                                  ▼                    ▼
                             [PostgreSQL]        [Redis Pub/Sub]
```

### 1. Frontend Architecture
* **Framework**: Next.js (App Router) / React
* **Language**: TypeScript
* **Styling**: Tailwind CSS utilizing semantic CSS variables (`globals.css`)
* **State Management**: React Context (`ThemeContext`, `TrakStore` for application state).
* **UI**: Modular components utilizing Radix UI primitives and a custom SVG-driven mobile navigation system.

### 2. Backend API Architecture
* **Framework**: Next.js Server Route Handlers (`src/app/api/`)
* **Validation**: Zod schema validation on all incoming payloads.
* **Security**: Edge middleware (`proxy.ts`) for public route filtering, backed by strict server-side DB session verification (`requireSession()`).
* **Rate Limiting**: Sliding-window rate limiter utilizing Redis (with memory fallback).

### 3. Database Layer
* **Database**: PostgreSQL
* **ORM**: Prisma (`prisma/schema.prisma`)
* **Schema Management**: Automated Prisma SQL migrations.
* **Seeding**: Environment-aware `seed.ts` script that strictly blocks default/demo user creation in production.

### 4. Authentication Architecture
* **Mechanism**: Opaque Session Tokens.
* **Storage**: Cryptographically random raw tokens stored in `HttpOnly` cookies.
* **Verification**: SHA-256 hashes of the tokens are stored in the PostgreSQL `Session` table.
* **Passwords**: Hashed via `bcryptjs` (cost 12).

### 5. Realtime Infrastructure
* **Server**: Custom Node.js WebSocket server (`server.ts`) utilizing the `ws` library.
* **Scalability**: Integrates with `ioredis`. Connects to a Redis cluster when `TRAK_RUNTIME_MODE=multi` to broadcast messages across multiple WebSocket server instances via Pub/Sub.
* **Signaling**: Acts as a secure, authenticated signaling relay for peer-to-peer WebRTC connections.

### 6. File Storage
* **Provider**: AWS S3.
* **Mechanism**: The Next.js backend generates secure presigned URLs (`@aws-sdk/s3-request-presigner`). The browser client uploads file buffers directly to S3, bypassing the Node server to save bandwidth.

### 7. Testing & Quality Assurance
* **Unit Testing**: Vitest (`src/__tests__/`) verifying security and business logic.
* **End-to-End**: Playwright (`e2e/`) verifying user flows.
* **Static Analysis**: ESLint and TypeScript strict mode integrated into the build pipeline.
* **Environment Gate**: A custom script (`scripts/check-prod-env.mjs`) that crashes the deployment if insecure dev configurations are detected.
