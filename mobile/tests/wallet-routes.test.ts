import { describe, expect, it } from 'vitest';

import {
  auditEventCopy,
  canManageMembers,
  canRemoveMember,
  organizationRoute,
  roleLabel,
} from '../lib/wallet-routes';

describe('wallet routes and permissions', () => {
  it('allows only owners and admins to manage members', () => {
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('treasurer')).toBe(false);
    expect(canManageMembers('viewer')).toBe(false);
  });

  it('builds an explicit organization route', () => {
    expect(organizationRoute('account-1')).toEqual({
      pathname: '/organization-members',
      params: { accountId: 'account-1' },
    });
    expect(roleLabel('treasurer')).toBe('Treasurer');
  });

  it('protects owners and admin peers from removal', () => {
    expect(canRemoveMember('owner', 'admin')).toBe(true);
    expect(canRemoveMember('admin', 'admin')).toBe(false);
    expect(canRemoveMember('admin', 'treasurer')).toBe(true);
    expect(canRemoveMember('owner', 'owner')).toBe(false);
  });

  it('writes compact organization audit copy', () => {
    expect(auditEventCopy({
      kind: 'member_role_changed',
      actorName: 'Nadia',
      targetName: 'Rafi',
      fromRole: 'viewer',
      toRole: 'treasurer',
    })).toBe('Nadia changed Rafi from viewer to treasurer');
  });
});
