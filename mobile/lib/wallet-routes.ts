export type WalletRole = 'owner' | 'admin' | 'treasurer' | 'viewer';

export function canManageMembers(role: WalletRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function organizationRoute(
  accountId: string,
): { pathname: '/organization-members'; params: { accountId: string } } {
  return { pathname: '/organization-members', params: { accountId } };
}

export function roleLabel(role: WalletRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
