export type WalletRole = 'owner' | 'admin' | 'treasurer' | 'viewer';

export function canManageMembers(role: WalletRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canRemoveMember(actorRole: WalletRole, targetRole: WalletRole): boolean {
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'admin' && targetRole !== 'admin';
}

export function auditEventCopy(input: {
  kind: 'organization_created' | 'member_added' | 'member_role_changed' | 'member_removed';
  actorName: string;
  targetName: string | null;
  fromRole: string | null;
  toRole: string | null;
}): string {
  if (input.kind === 'organization_created') return `${input.actorName} created the organization`;
  if (input.kind === 'member_added') return `${input.actorName} added ${input.targetName ?? 'a member'}`;
  if (input.kind === 'member_removed') return `${input.actorName} removed ${input.targetName ?? 'a member'}`;
  return `${input.actorName} changed ${input.targetName ?? 'a member'} from ${input.fromRole ?? 'member'} to ${input.toRole ?? 'member'}`;
}

export function organizationRoute(
  accountId: string,
): { pathname: '/organization-members'; params: { accountId: string } } {
  return { pathname: '/organization-members', params: { accountId } };
}

export function roleLabel(role: WalletRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
