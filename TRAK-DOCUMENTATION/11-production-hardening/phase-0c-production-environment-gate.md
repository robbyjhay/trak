# Production Environment Gate (Phase 0C)

This document details the environment validation checks enforced by TRAK to prevent insecure or misconfigured deployments.

## The Script: `scripts/check-prod-env.mjs`

To ensure that the application never boots in an unsafe state in a production environment, an explicit environment gate was created. This script is intended to run as part of the CI/CD pipeline or deployment initialization (`npm run check:prod-env`).

### Executed Checks

1. **`DATABASE_URL`**
   * **Rule**: Must be a string starting with `postgres://` or `postgresql://`.
   * **Why it matters**: Ensures the application does not attempt to boot using a SQLite mock or missing connection string.
   
2. **`TRAK_SESSION_SECRET`**
   * **Rule**: Must be at least 32 characters long.
   * **Rule**: Must *not* equal `trak-dev-secret-change-me-in-production-32b`.
   * **Why it matters**: This secret is used for cryptographic operations (like opaque session token management and encryption). A weak or default secret allows trivial session hijacking.

3. **`APP_URL`**
   * **Rule**: Must begin with `https://` if `NODE_ENV === "production"`.
   * **Why it matters**: Enforces secure transit for cookies and API requests.

4. **Seed & Dev Protection (Production Only)**
   * **Rules**: 
     * `ENABLE_DEV_LOGIN` must be false or unset.
     * `SEED_DEMO_USERS` must be false or unset.
     * `DEV_SEED_PASSWORD` must not be set.
   * **Why it matters**: Prevents the accidental injection of mock users, default passwords, or backdoor "dev" login bypasses into a live government database.

5. **Redis Configuration**
   * **Rule**: If `TRAK_RUNTIME_MODE === "multi"`, then `REDIS_URL` is strictly required. Otherwise, it generates a warning.
   * **Why it matters**: Ensures that rate limiting and WebSocket Pub/Sub function correctly across multiple server instances.

### Failure Behavior
The script fails closed. If any of the `req` (required) conditions fail, it pushes the error to an array and exits the Node process with code `1` (`process.exit(1)`). This halts the build or deployment pipeline immediately.

## Current State
The environment gate is fully implemented and actively protects the repository from misconfiguration.
