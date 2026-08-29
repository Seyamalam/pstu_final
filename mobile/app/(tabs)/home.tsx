import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { ActivityRow } from '@/components/activity-row';
import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatMoney } from '@/lib/format';

export default function HomeScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  if (dashboard === undefined) return <LoadingState />;

  return (
    <Page title={dashboard.user.displayName}>
      <Card className="overflow-hidden border-primary/20 bg-primary">
        <Card.Header>
          <Text size="sm" className="text-primary-foreground/80">Available</Text>
          <Text size="3xl" weight="bold" className="text-primary-foreground">
            {formatMoney(dashboard.account.balancePoisha)}
          </Text>
          <Text size="sm" className="text-primary-foreground/80">@{dashboard.user.handle}</Text>
        </Card.Header>
      </Card>

      <View className="flex-row gap-3">
        <Button fullWidth className="flex-1" onPress={() => router.push('/send')}>Send</Button>
        <Button
          fullWidth
          variant="outline"
          className="flex-1"
          onPress={() => router.push('/(tabs)/scan')}
        >
          Scan
        </Button>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="lg" weight="semibold">Recent</Text>
          <Button size="sm" variant="ghost" onPress={() => router.push('/(tabs)/activity')}>All</Button>
        </View>
        {dashboard.recentActivity.length ? (
          <Card className="overflow-hidden">
            {dashboard.recentActivity.map((entry, index) => (
              <View key={entry.publicId}>
                {index ? <View className="h-px bg-border" /> : null}
                <ActivityRow
                  entry={entry}
                  onPress={() => router.push({
                    pathname: '/receipt/[public-id]',
                    params: { 'public-id': entry.publicId },
                  })}
                />
              </View>
            ))}
          </Card>
        ) : (
          <MessageCard title="No activity yet" />
        )}
      </View>
    </Page>
  );
}
