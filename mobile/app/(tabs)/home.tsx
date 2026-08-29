import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { ActivityRow } from '@/components/activity-row';
import { ContentHandoff } from '@/components/content-handoff';
import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { RailActivityRow } from '@/components/rail-activity-row';
import { WalletSwitcher } from '@/components/wallet-switcher';
import { api } from '@/lib/convex-api';
import { formatMoney } from '@/lib/format';
import { canManageMembers, organizationRoute, roleLabel } from '@/lib/wallet-routes';

export default function HomeScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  const wallets = useQuery(api.wallets.list, {});
  const railActivity = useQuery(
    api.rails.list,
    wallets ? { accountId: wallets.activeAccountId, limit: 3 } : 'skip',
  );
  if (dashboard === undefined || wallets === undefined) return <LoadingState />;
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const canMoveMoney = active.role !== 'viewer';

  return (
    <Page title={dashboard.user.displayName} safeTop>
      <ContentHandoff>
      <WalletSwitcher wallets={wallets} />

      <Card className="overflow-hidden border-primary/20 bg-primary">
        <Card.Header>
          <Text size="sm" className="text-primary-foreground/80">Available</Text>
          <Animated.View
            key={active.accountId}
            entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}
          >
            <Text size="3xl" weight="bold" className="text-primary-foreground">
              {formatMoney(active.balancePoisha)}
            </Text>
          </Animated.View>
          <Text size="sm" className="text-primary-foreground/80">
            {active.kind === 'personal' ? `@${dashboard.user.handle}` : roleLabel(active.role)}
          </Text>
        </Card.Header>
      </Card>

      <View className="flex-row gap-3">
        <Button
          fullWidth
          className="flex-1"
          disabled={!canMoveMoney}
          onPress={() => router.push('/add-money')}
        >
          Add money
        </Button>
        <Button
          fullWidth
          variant="outline"
          className="flex-1"
          disabled={!canMoveMoney}
          onPress={() => router.push('/withdraw')}
        >
          Withdraw
        </Button>
      </View>
      <View className="flex-row gap-3">
        {active.kind === 'personal' ? (
          <Button fullWidth variant="outline" className="flex-1" onPress={() => router.push('/send')}>
            Send
          </Button>
        ) : null}
        <Button
          fullWidth
          variant="outline"
          className="flex-1"
          onPress={() => router.push('/(tabs)/scan')}
        >
          Scan
        </Button>
        {active.kind === 'organization' && canManageMembers(active.role) ? (
          <Button
            fullWidth
            variant="outline"
            className="flex-1"
            onPress={() => router.push(organizationRoute(active.accountId))}
          >
            Members
          </Button>
        ) : null}
      </View>

      {railActivity?.length ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text size="lg" weight="semibold">Money in & out</Text>
            <Button size="sm" variant="ghost" onPress={() => router.push('/(tabs)/activity')}>All</Button>
          </View>
          <Card className="overflow-hidden">
            {railActivity.map((transaction, index) => (
              <View key={transaction.id}>
                {index ? <View className="h-px bg-border" /> : null}
                <RailActivityRow transaction={transaction} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {active.kind === 'personal' ? <View className="gap-2">
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
      </View> : null}
      </ContentHandoff>
    </Page>
  );
}
