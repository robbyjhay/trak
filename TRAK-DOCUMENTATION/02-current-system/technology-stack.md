# Technology Stack

The current architecture of TRAK relies on the following major technologies, verified from `package.json` and project configuration files.

| Technology | Version | Purpose | Evidence |
| :--- | :--- | :--- | :--- |
| **Next.js** | `16.3.0` | Full-stack React framework providing App Router, SSR, and API endpoints. | `package.json` (`next`) |
| **React** | `19.2.8` | Core UI library for building components. | `package.json` (`react`, `react-dom`) |
| **TypeScript** | `7.0.2` | Strongly typed programming language across frontend and backend. | `package.json` (`typescript`) |
| **Tailwind CSS** | `^4` | Utility-first CSS framework for styling. | `package.json` (`tailwindcss`) |
| **Prisma** | `7.9.1` | Type-safe Database ORM. | `package.json` (`prisma`, `@prisma/client`) |
| **PostgreSQL** | `^8.23.0` | Relational database engine. | `prisma/schema.prisma` (`provider="postgresql"`) |
| **Node.js** | `^20` | Server runtime environment. | `package.json` (`@types/node`) |
| **ws** | `^8.21.3` | WebSocket server implementation for realtime. | `package.json` (`ws`), `server.ts` |
| **ioredis** | `^6.0.0` | Redis client for multi-node WebSocket Pub/Sub. | `package.json` (`ioredis`), `server.ts` |
| **AWS SDK S3** | `^3.1106.0` | Object storage for file uploads and evidence. | `package.json` (`@aws-sdk/client-s3`) |
| **Zod** | `^4.4.3` | Schema validation for API inputs and forms. | `package.json` (`zod`) |
| **bcryptjs** | `^3.0.3` | Password hashing algorithm. | `package.json` (`bcryptjs`) |
| **jose** | `^6.2.8` | JWT generation and verification. | `package.json` (`jose`) |
| **Vitest** | `^4.1.10` | Unit testing framework. | `package.json` (`vitest`) |
| **Playwright** | `^1.62.1` | End-to-end (E2E) UI testing framework. | `package.json` (`@playwright/test`) |
| **ESLint** | `^9` | Code linting and static analysis. | `package.json` (`eslint`) |
