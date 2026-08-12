import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // bcrypt cost-12 hashing can exceed the 5s default on slower CI hosts
    testTimeout: 15_000,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
