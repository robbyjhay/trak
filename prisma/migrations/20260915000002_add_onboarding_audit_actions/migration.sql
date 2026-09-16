-- New onboarding lifecycle audit actions.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'onboarding_requested';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'onboarding_approved';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'onboarding_declined';