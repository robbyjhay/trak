-- Add 'onboard' token type for self-service member onboarding links
-- (head mints a link; the invitee creates their own profile as a member).

-- AlterEnum
ALTER TYPE "AuthTokenType" ADD VALUE 'onboard';