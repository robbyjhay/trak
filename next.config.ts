import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Dev-only: allow LAN device access during local development.
  // Never required in production builds.
  ...(process.env.NODE_ENV === "development" && process.env.ALLOWED_DEV_ORIGINS
    ? {
        allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }
    : process.env.NODE_ENV === "development"
      ? { allowedDevOrigins: ["10.18.161.231"] }
      : {}),
};

export default nextConfig;
