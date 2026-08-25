import type { User, UserRole } from "./types";

export function roleLabel(u: {
  role: UserRole;
  isCorps?: boolean;
  isSecretary?: boolean;
}): string {
  if (u.role === "head") return "Unit Head";
  if (u.isCorps) return "NYSC Corps Member";
  if (u.isSecretary) return "Secretary";
  return "Member";
}

export function canComment(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function canWipeCommunity(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function canBroadcast(
  user: Pick<User, "role" | "isSecretary">,
): boolean {
  return user.role === "head" || user.isSecretary;
}

export function canDelegate(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function canManageTeamProfiles(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function canManageResponsibilities(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function isHead(user: Pick<User, "role">): boolean {
  return user.role === "head";
}

export function canDeleteOwnMessage(user: Pick<User, "role">): boolean {
  return true;
}

export function canDeleteAnyCommunityMessage(user: Pick<User, "role">): boolean {
  return user.role === "head";
}
