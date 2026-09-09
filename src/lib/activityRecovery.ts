/**
 * Missed Activity Recovery Window.
 *
 * During a production outage, automatic Missed Activity processing is paused
 * and members are allowed to log activities for previous dates. This module is
 * the single source of truth for whether recovery mode is active, so the
 * behavior can be turned on/off by env/config without scattering conditions.
 *
 * Set ACTIVITY_RECOVERY_ENABLED=true (or "1") to enable recovery mode.
 */

export const ACTIVITY_RECOVERY_ENV = "ACTIVITY_RECOVERY_ENABLED";

export function isActivityRecoveryEnabled(): boolean {
  const v = process.env[ACTIVITY_RECOVERY_ENV];
  return v === "true" || v === "1";
}
