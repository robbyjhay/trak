/**
 * Database layer public exports.
 * Domain data lives in PostgreSQL via Prisma (Phase 1+).
 * The JSON file store is deprecated and must not be used for new code.
 */
export { prisma } from "./prisma";
export * from "./service";
export {
  mapUser,
  mapActivity,
  mapDailyLog,
  mapResponsibility,
  mapNotification,
} from "./mappers";
