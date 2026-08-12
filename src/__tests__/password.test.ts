import { expect, test, describe } from 'vitest';
import { validatePasswordPolicy, generateTemporaryPassword } from '@/lib/auth/password';

describe('Password Policy', () => {
  test('rejects short passwords', () => {
    expect(validatePasswordPolicy('short1!')).toBe('too_short');
  });

  test('rejects passwords exceeding max length', () => {
    const longPass = 'a'.repeat(129);
    expect(validatePasswordPolicy(longPass)).toBe('too_long');
  });

  test('rejects password same as username', () => {
    expect(validatePasswordPolicy('john.doe1234', { username: 'john.doe1234' })).toBe('equals_username');
  });

  test('rejects mismatched passwords', () => {
    expect(validatePasswordPolicy('GoodPassword123!', { confirm: 'Different123!' })).toBe('mismatch');
  });

  test('accepts valid password', () => {
    expect(validatePasswordPolicy('StrongPassword123!')).toBeNull();
  });
});

describe('Password Utilities', () => {
  test('generates temp password of appropriate length', () => {
    const temp = generateTemporaryPassword(18);
    // Base64url of 18 bytes is 24 chars
    expect(temp.length).toBe(24);
  });
});
