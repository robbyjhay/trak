import { expect, test, describe } from 'vitest';
import { 
  roleLabel, 
  canComment, 
  canBroadcast, 
  canManageTeamProfiles 
} from '@/lib/permissions';
import type { UserRole } from '@/lib/types';

describe('RBAC Permissions', () => {
  test('roleLabel formats correctly', () => {
    expect(roleLabel({ role: 'head' })).toBe('Head of Unit');
    expect(roleLabel({ role: 'member', isCorps: true })).toBe('NYSC Corps Member');
    expect(roleLabel({ role: 'member', isSecretary: true })).toBe('Secretary');
    expect(roleLabel({ role: 'member' })).toBe('Member');
  });

  test('canComment', () => {
    expect(canComment({ role: 'head' })).toBe(true);
    expect(canComment({ role: 'member' })).toBe(false);
  });

  test('canBroadcast', () => {
    expect(canBroadcast({ role: 'head', isSecretary: false })).toBe(true);
    expect(canBroadcast({ role: 'member', isSecretary: true })).toBe(true);
    expect(canBroadcast({ role: 'member', isSecretary: false })).toBe(false);
  });

  test('canManageTeamProfiles', () => {
    expect(canManageTeamProfiles({ role: 'head' })).toBe(true);
    expect(canManageTeamProfiles({ role: 'member' })).toBe(false);
  });
});
