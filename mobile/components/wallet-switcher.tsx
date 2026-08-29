import { useState } from 'react';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { api } from '@/lib/convex-api';
import { roleLabel } from '@/lib/wallet-routes';

type WalletList = FunctionReturnType<typeof api.wallets.list>;
type WalletContext = WalletList['contexts'][number];

function walletDescription(wallet: WalletContext) {
  return `${wallet.kind === 'personal' ? 'Personal' : 'Organization'} · ${roleLabel(wallet.role)}`;
}

export function WalletSwitcher({ wallets }: { wallets: WalletList }) {
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const switchContext = useMutation(api.wallets.switchContext);
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];

  async function select(wallet: WalletContext) {
    if (wallet.accountId === wallets.activeAccountId) {
      setOpen(false);
      return;
    }
    setSwitchingId(wallet.accountId);
    setError(null);
    try {
      await switchContext({ accountId: wallet.accountId });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not switch wallet.');
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <View className="gap-2">
      <Card className="overflow-hidden">
        <Item size="sm" onPress={() => setOpen((value) => !value)}>
          <Item.Content>
            <Item.Title>{active.name}</Item.Title>
            <Item.Description>{walletDescription(active)}</Item.Description>
          </Item.Content>
          <Item.Actions>
            <Text size="sm" weight="semibold">{open ? 'Close' : 'Switch'}</Text>
          </Item.Actions>
        </Item>
        {open ? (
          <View>
            <View className="h-px bg-border" />
            {wallets.contexts.map((wallet, index) => (
              <View key={wallet.accountId}>
                {index ? <View className="h-px bg-border" /> : null}
                <Item
                  size="xs"
                  disabled={switchingId !== null}
                  onPress={() => void select(wallet)}
                >
                  <Item.Content>
                    <Item.Title>{wallet.name}</Item.Title>
                    <Item.Description>{walletDescription(wallet)}</Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Text muted size="xs">
                      {switchingId === wallet.accountId
                        ? 'Switching'
                        : wallet.accountId === wallets.activeAccountId
                          ? 'Active'
                          : ''}
                    </Text>
                  </Item.Actions>
                </Item>
              </View>
            ))}
            <View className="h-px bg-border" />
            <View className="p-2">
              <Button
                size="sm"
                variant="ghost"
                fullWidth
                onPress={() => router.push('/create-organization')}
              >
                New organization
              </Button>
            </View>
          </View>
        ) : null}
      </Card>
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
    </View>
  );
}
