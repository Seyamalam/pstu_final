import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { ContentHandoff } from '@/components/content-handoff';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/format';
import {
  auditEventCopy,
  canManageMembers,
  canRemoveMember,
  roleLabel,
  type WalletRole,
} from '@/lib/wallet-routes';

type AssignableRole = Exclude<WalletRole, 'owner'>;

export default function OrganizationMembersScreen() {
  const params = useLocalSearchParams<{ accountId?: string }>();
  const wallets = useQuery(api.wallets.list, {});
  const account = wallets?.contexts.find(
    (wallet) => wallet.kind === 'organization' && wallet.accountId === params.accountId,
  );
  const members = useQuery(
    api.wallets.listMembers,
    account ? { accountId: account.accountId } : 'skip',
  );
  const audit = useQuery(
    api.wallets.listAudit,
    account ? { accountId: account.accountId, limit: 30 } : 'skip',
  );
  const addMember = useMutation(api.wallets.addMember);
  const removeMember = useMutation(api.wallets.removeMember);
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<AssignableRole>('treasurer');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (
    wallets === undefined
    || (account && (members === undefined || audit === undefined))
  ) return <LoadingState />;
  if (!account) {
    return <Page><MessageCard title="Organization not found" /></Page>;
  }
  if (!canManageMembers(account.role)) {
    return <Page><MessageCard title="Member access is restricted" /></Page>;
  }
  const selectedAccount = account;

  const roles: AssignableRole[] = selectedAccount.role === 'owner'
    ? ['admin', 'treasurer', 'viewer']
    : ['treasurer', 'viewer'];

  async function saveMember() {
    const normalizedHandle = handle.trim().replace(/^@/, '').toLowerCase();
    setError(null);
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedHandle)) {
      setError('Enter a valid member handle.');
      return;
    }
    setSubmitting(true);
    try {
      await addMember({ accountId: selectedAccount.accountId, handle: normalizedHandle, role });
      setHandle('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save member.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSelectedMember(member: NonNullable<typeof members>[number]) {
    if (confirmRemoveId !== member.membershipId) {
      setConfirmRemoveId(member.membershipId);
      return;
    }
    setError(null);
    setRemovingId(member.membershipId);
    try {
      await removeMember({
        accountId: selectedAccount.accountId,
        membershipId: member.membershipId,
      });
      setConfirmRemoveId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove member.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Page>
      <ContentHandoff>
      <Text muted size="sm">{selectedAccount.name}</Text>
      <View className="gap-2">
        <Text size="lg" weight="semibold">Members</Text>
        <Card className="overflow-hidden">
          {members?.map((member, index) => (
            <View key={member.membershipId}>
              {index ? <View className="h-px bg-border" /> : null}
              <Item size="sm">
                <Item.Content>
                  <Item.Title>{member.user.displayName}</Item.Title>
                  <Item.Description>@{member.user.handle}</Item.Description>
                </Item.Content>
                <Item.Actions className="items-end gap-1">
                  <Text muted size="sm">{roleLabel(member.role)}</Text>
                  {canRemoveMember(selectedAccount.role, member.role) ? (
                    <Button
                      size="sm"
                      variant={confirmRemoveId === member.membershipId ? 'destructive' : 'ghost'}
                      className="min-h-12"
                      disabled={removingId !== null}
                      onPress={() => void removeSelectedMember(member)}
                    >
                      {removingId === member.membershipId
                        ? 'Removing'
                        : confirmRemoveId === member.membershipId
                          ? 'Confirm'
                          : 'Remove'}
                    </Button>
                  ) : null}
                </Item.Actions>
              </Item>
            </View>
          ))}
        </Card>
      </View>

      <Card>
        <Card.Header>
          <Text size="lg" weight="semibold">Add or update</Text>
        </Card.Header>
        <Card.Content className="gap-4">
          <Input
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Member handle"
            accessibilityLabel="Member handle"
            disabled={submitting}
          />
          <View className="flex-row flex-wrap gap-2">
            {roles.map((option) => (
              <Button
                key={option}
                size="sm"
                className="min-h-12"
                variant={role === option ? 'primary' : 'outline'}
                disabled={submitting}
                onPress={() => setRole(option)}
              >
                {roleLabel(option)}
              </Button>
            ))}
          </View>
          <Button disabled={submitting} fullWidth onPress={() => void saveMember()}>
            {submitting ? 'Saving' : 'Save member'}
          </Button>
        </Card.Content>
      </Card>

      <View className="gap-2">
        <Text size="lg" weight="semibold">History</Text>
        {audit?.length ? (
          <Card className="overflow-hidden">
            {audit.map((event, index) => (
              <View key={event.id}>
                {index ? <View className="h-px bg-border" /> : null}
                <Item size="sm">
                  <Item.Content>
                    <Item.Title>{auditEventCopy({
                      kind: event.kind,
                      actorName: event.actor.displayName,
                      targetName: event.target?.displayName ?? null,
                      fromRole: event.fromRole,
                      toRole: event.toRole,
                    })}</Item.Title>
                    <Item.Description>{formatDate(event.createdAt)}</Item.Description>
                  </Item.Content>
                </Item>
              </View>
            ))}
          </Card>
        ) : (
          <MessageCard title="No organization history" />
        )}
      </View>
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      </ContentHandoff>
    </Page>
  );
}
