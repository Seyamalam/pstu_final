import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { usePaginatedQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Text } from 'panelui-native/primitives/text';

import { ActivityRow } from '@/components/activity-row';
import { LoadingState } from '@/components/loading-state';
import { api } from '@/lib/convex-api';

export default function ActivityScreen() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.activity.list,
    {},
    { initialNumItems: 20 },
  );
  if (status === 'LoadingFirstPage') return <LoadingState />;

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={results}
        keyExtractor={(item) => item.publicId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="mx-auto w-full max-w-2xl px-5 pb-28 pt-5"
        ListHeaderComponent={<Text size="3xl" weight="bold" className="mb-5">Activity</Text>}
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
        ListEmptyComponent={<Text muted>No activity</Text>}
        ListFooterComponent={
          status === 'CanLoadMore' ? (
            <Button className="mt-4" variant="ghost" onPress={() => loadMore(20)}>Load more</Button>
          ) : null
        }
      />
    </View>
  );
}

