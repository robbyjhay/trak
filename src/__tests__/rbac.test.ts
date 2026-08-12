import { describe, expect, test } from "vitest";
import {
  roleLabel,
  canComment,
  canWipeCommunity,
  canBroadcast,
  canDelegate,
  canManageTeamProfiles,
  canManageResponsibilities,
  isHead,
} from "@/lib/permissions";
import type { User, UserRole } from "@/lib/types";

function makeUser(role: UserRole, overrides: Partial<User> = {}): User {
  return {
    id: "test-id",
    name: "Test User",
    username: "testuser",
    role,
    isSecretary: false,
    isCorps: false,
    color: "#000000",
    phone: "+1234567890",
    designation: "Test",
    gradeLevel: "GL10",
    sex: "Male",
    stateOfOrigin: "Test",
    dateJoined: "2024-01-01",
    photoUrl: null,
    ...overrides,
  };
}

describe("RBAC - Role Labels", () => {
  test("head role returns Unit Head", () => {
    expect(roleLabel({ role: "head" })).toBe("Unit Head");
  });

  test("corps member returns NYSC Corps Member", () => {
    expect(roleLabel({ role: "member", isCorps: true })).toBe("NYSC Corps Member");
  });

  test("secretary returns Secretary", () => {
    expect(roleLabel({ role: "member", isSecretary: true })).toBe("Secretary");
  });

  test("regular member returns Member", () => {
    expect(roleLabel({ role: "member" })).toBe("Member");
  });

  test("head with corps flag still returns Unit Head", () => {
    expect(roleLabel({ role: "head", isCorps: true })).toBe("Unit Head");
  });
});

describe("RBAC - Comment Permissions", () => {
  test("head can comment", () => {
    expect(canComment(makeUser("head"))).toBe(true);
  });

  test("member cannot comment", () => {
    expect(canComment(makeUser("member"))).toBe(false);
  });

  test("secretary member cannot comment", () => {
    expect(canComment(makeUser("member", { isSecretary: true }))).toBe(false);
  });
});

describe("RBAC - Wipe Community Permissions", () => {
  test("head can wipe community", () => {
    expect(canWipeCommunity(makeUser("head"))).toBe(true);
  });

  test("member cannot wipe community", () => {
    expect(canWipeCommunity(makeUser("member"))).toBe(false);
  });

  test("secretary member cannot wipe community", () => {
    expect(canWipeCommunity(makeUser("member", { isSecretary: true }))).toBe(false);
  });
});

describe("RBAC - Broadcast Permissions", () => {
  test("head can broadcast", () => {
    expect(canBroadcast(makeUser("head"))).toBe(true);
  });

  test("secretary can broadcast", () => {
    expect(canBroadcast(makeUser("member", { isSecretary: true }))).toBe(true);
  });

  test("regular member cannot broadcast", () => {
    expect(canBroadcast(makeUser("member"))).toBe(false);
  });

  test("corps member cannot broadcast", () => {
    expect(canBroadcast(makeUser("member", { isCorps: true }))).toBe(false);
  });
});

describe("RBAC - Delegate Permissions", () => {
  test("head can delegate", () => {
    expect(canDelegate(makeUser("head"))).toBe(true);
  });

  test("member cannot delegate", () => {
    expect(canDelegate(makeUser("member"))).toBe(false);
  });

  test("secretary member cannot delegate", () => {
    expect(canDelegate(makeUser("member", { isSecretary: true }))).toBe(false);
  });
});

describe("RBAC - Manage Team Profiles Permissions", () => {
  test("head can manage team profiles", () => {
    expect(canManageTeamProfiles(makeUser("head"))).toBe(true);
  });

  test("member cannot manage team profiles", () => {
    expect(canManageTeamProfiles(makeUser("member"))).toBe(false);
  });

  test("secretary member cannot manage team profiles", () => {
    expect(canManageTeamProfiles(makeUser("member", { isSecretary: true }))).toBe(false);
  });
});

describe("RBAC - Manage Responsibilities Permissions", () => {
  test("head can manage responsibilities", () => {
    expect(canManageResponsibilities(makeUser("head"))).toBe(true);
  });

  test("member cannot manage responsibilities", () => {
    expect(canManageResponsibilities(makeUser("member"))).toBe(false);
  });
});

describe("RBAC - isHead Check", () => {
  test("head returns true", () => {
    expect(isHead(makeUser("head"))).toBe(true);
  });

  test("member returns false", () => {
    expect(isHead(makeUser("member"))).toBe(false);
  });

  test("secretary member returns false", () => {
    expect(isHead(makeUser("member", { isSecretary: true }))).toBe(false);
  });
});

describe("RBAC - Combined Role Scenarios", () => {
  test("head with secretary flag has all head permissions", () => {
    const headSecretary = makeUser("head", { isSecretary: true });
    expect(canComment(headSecretary)).toBe(true);
    expect(canWipeCommunity(headSecretary)).toBe(true);
    expect(canBroadcast(headSecretary)).toBe(true);
    expect(canDelegate(headSecretary)).toBe(true);
    expect(canManageTeamProfiles(headSecretary)).toBe(true);
    expect(canManageResponsibilities(headSecretary)).toBe(true);
    expect(isHead(headSecretary)).toBe(true);
  });

  test("corps member has same permissions as regular member", () => {
    const corps = makeUser("member", { isCorps: true });
    const regular = makeUser("member");
    
    expect(canComment(corps)).toBe(canComment(regular));
    expect(canWipeCommunity(corps)).toBe(canWipeCommunity(regular));
    expect(canBroadcast(corps)).toBe(canBroadcast(regular));
    expect(canDelegate(corps)).toBe(canDelegate(regular));
    expect(canManageTeamProfiles(corps)).toBe(canManageTeamProfiles(regular));
    expect(canManageResponsibilities(corps)).toBe(canManageResponsibilities(regular));
  });

  test("secretary has broadcast but not other head permissions", () => {
    const secretary = makeUser("member", { isSecretary: true });
    expect(canBroadcast(secretary)).toBe(true);
    expect(canComment(secretary)).toBe(false);
    expect(canDelegate(secretary)).toBe(false);
    expect(canManageTeamProfiles(secretary)).toBe(false);
    expect(canManageResponsibilities(secretary)).toBe(false);
    expect(canWipeCommunity(secretary)).toBe(false);
  });
});
