import { describe, expect, it } from 'vitest';

import { canManageMembers, organizationRoute, roleLabel } from '../lib/wallet-routes';

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
});
