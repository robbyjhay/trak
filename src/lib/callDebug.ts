"use client";

/**
 * Gate-keeper for call/WebRTC diagnostics.
 *
 * Logging is off by default so production networks stay quiet and no media
 * payloads can leak. Enable explicitly with:
 *   NEXT_PUBLIC_DEBUG_CALLS=1   (browser bundle)
 *   DEBUG_CALLS=1               (server / build-time fallback)
 *
 * The helper never logs credentials, SDP bodies, or ICE candidates — it only
 * logs high-level lifecycle transitions.
 */

const DEBUG_ENABLED =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_DEBUG_CALLS === "1" ||
    process.env.DEBUG_CALLS === "1");

export function callDebug(...args: unknown[]): void {
  if (!DEBUG_ENABLED) return;
  // eslint-disable-next-line no-console
  console.debug("[calls]", ...args);
}