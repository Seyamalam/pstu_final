import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { ActivityRow } from '@/components/activity-row';
import { LoadingState } from '@/components/loading-state';
import { RailActivityRow } from '@/components/rail-activity-row';
import { api } from '@/lib/convex-api';

export default function ActivityScreen() {
  const wallets = useQuery(api.wallets.list, {});
  const activeWallet = wallets?.contexts.find(
    (wallet) => wallet.accountId === wallets.activeAccountId,
  ) ?? wallets?.contexts[0];
  const { results, status, loadMore } = usePaginatedQuery(
    api.activity.list,
    activeWallet?.kind === 'personal' ? {} : 'skip',
    { initialNumItems: 20 },
  );
  const railActivity = useQuery(
    api.rails.list,
    wallets ? { accountId: wallets.activeAccountId, limit: 30 } : 'skip',
  );
  if (
    wallets === undefined
    || !activeWallet
    || (activeWallet.kind === 'personal' && status === 'LoadingFirstPage')
  ) return <LoadingState />;
  const active = activeWallet;
  const transferResults = active.kind === 'personal' ? results : [];

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={transferResults}
        keyExtractor={(item) => item.publicId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="mx-auto w-full max-w-2xl px-5 pb-28 pt-5"
        ListHeaderComponent={(
          <View className="mb-5 gap-4">
            <View>
              <Text size="3xl" weight="bold">Activity</Text>
              <Text muted size="sm">{active.name}</Text>
            </View>
            {railActivity?.length ? (
              <Card className="overflow-hidden">
                {railActivity.map((transaction, index) => (
                  <View key={transaction.id}>
                    {index ? <View className="h-px bg-border" /> : null}
                    <RailActivityRow transaction={transaction} />
                  </View>
                ))}
              </Card>
            ) : null}
            {transferResults.length ? <Text size="lg" weight="semibold">Payments</Text> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        renderItem={({ item }) => (
          <ActivityRow
            entry={item}
            onPress={() => router.push({
              pathname: '/receipt/[public-id]',
              params: { 'public-id': item.publicId },
            })}
          />
        )}
        ListEmptyComponent={!railActivity?.length ? <Text muted>No activity</Text> : null}
        ListFooterComponent={
          active.kind === 'personal' && status === 'CanLoadMore' ? (
            <Button className="mt-4" variant="ghost" onPress={() => loadMore(20)}>Load more</Button>
          ) : null
        }
      />
    </View>
  );
}
