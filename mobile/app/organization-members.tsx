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
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { canManageMembers, roleLabel, type WalletRole } from '@/lib/wallet-routes';

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
  const addMember = useMutation(api.wallets.addMember);
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<AssignableRole>('treasurer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (wallets === undefined || (account && members === undefined)) return <LoadingState />;
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

  return (
    <Page>
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
                <Item.Actions><Text muted size="sm">{roleLabel(member.role)}</Text></Item.Actions>
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
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
    </Page>
  );
}
