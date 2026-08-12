import { describe, expect, test } from "vitest";
import {
  validatePasswordPolicy,
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
  passwordPolicyMessage,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/auth/password";

describe("Password Hashing", () => {
  // bcrypt cost 12 is intentionally slow; allow headroom on CI/low-CPU hosts
  const bcryptTimeout = 20_000;

  test(
    "hashPassword produces bcrypt hash",
    async () => {
      const hash = await hashPassword("TestPassword123!");
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/);
      expect(hash.length).toBeGreaterThan(50);
    },
    bcryptTimeout,
  );

  test(
    "verifyPassword returns true for correct password",
    async () => {
      const password = "MySecurePass123!";
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    },
    bcryptTimeout,
  );

  test(
    "verifyPassword returns false for wrong password",
    async () => {
      const hash = await hashPassword("CorrectPassword123!");
      const result = await verifyPassword("WrongPassword123!", hash);
      expect(result).toBe(false);
    },
    bcryptTimeout,
  );

  test(
    "hashPassword uses configured bcrypt cost",
    async () => {
      const hash = await hashPassword("TestPassword123!");
      // bcrypt cost 12 means $2a$12$ or $2b$12$
      expect(hash).toMatch(/\$2[aby]?\$12\$/);
    },
    bcryptTimeout,
  );
});

describe("Password Policy Validation", () => {
  test("rejects password shorter than minimum", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validatePasswordPolicy(short)).toBe("too_short");
  });

  test("accepts password at minimum length", () => {
    const minPass = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validatePasswordPolicy(minPass)).toBeNull();
  });

  test("rejects password longer than maximum", () => {
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(validatePasswordPolicy(long)).toBe("too_long");
  });

  test("accepts password at maximum length", () => {
    const maxPass = "a".repeat(MAX_PASSWORD_LENGTH);
    expect(validatePasswordPolicy(maxPass)).toBeNull();
  });

  test("rejects password matching username (case-insensitive)", () => {
    expect(validatePasswordPolicy("john.doe1234", { username: "JOHN.DOE1234" })).toBe("equals_username");
    expect(validatePasswordPolicy("john.doe1234", { username: "john.doe1234" })).toBe("equals_username");
  });

  test("accepts password not matching username", () => {
    expect(validatePasswordPolicy("DifferentPass123!", { username: "john.doe" })).toBeNull();
  });

  test("rejects mismatched confirm password", () => {
    expect(validatePasswordPolicy("Password123!", { confirm: "Different123!" })).toBe("mismatch");
  });

  test("accepts matching confirm password", () => {
    expect(validatePasswordPolicy("Password123!", { confirm: "Password123!" })).toBeNull();
  });

  test("validates all constraints together", () => {
    // too_short takes priority over equals_username
    expect(validatePasswordPolicy("short", { username: "user", confirm: "mismatch" })).toBe("too_short");
    // Password must be at least MIN_PASSWORD_LENGTH and exactly match username (case-insensitive)
    expect(validatePasswordPolicy("username1234", { username: "USERNAME1234", confirm: "username1234" })).toBe("equals_username");
    expect(validatePasswordPolicy("ValidPass123!", { username: "user", confirm: "DifferentPass123!" })).toBe("mismatch");
    expect(validatePasswordPolicy("ValidPass123!", { username: "user", confirm: "ValidPass123!" })).toBeNull();
  });
});

describe("Password Policy Messages", () => {
  test("returns correct messages for each error type", () => {
    expect(passwordPolicyMessage("too_short")).toContain(`${MIN_PASSWORD_LENGTH}`);
    expect(passwordPolicyMessage("too_long")).toContain(`${MAX_PASSWORD_LENGTH}`);
    expect(passwordPolicyMessage("equals_username")).toContain("username");
    expect(passwordPolicyMessage("mismatch")).toContain("do not match");
  });
});

describe("Temporary Password Generation", () => {
  test("generates password with specified byte length", () => {
    const pass = generateTemporaryPassword(18);
    expect(pass).toBeDefined();
    expect(typeof pass).toBe("string");
  });

  test("generates unique passwords each time", () => {
    const pass1 = generateTemporaryPassword();
    const pass2 = generateTemporaryPassword();
    expect(pass1).not.toBe(pass2);
  });

  test("generates base64url-safe characters", () => {
    const pass = generateTemporaryPassword(24);
    expect(pass).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("default length produces reasonable output", () => {
    const pass = generateTemporaryPassword();
    expect(pass.length).toBeGreaterThanOrEqual(20);
  });
});
