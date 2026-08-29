import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { ContentHandoff } from '@/components/content-handoff';
import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { SplitRow } from '@/components/split-row';
import { api } from '@/lib/convex-api';

export default function SplitBillsScreen() {
  const owned = useQuery(api.splitBills.list, { role: 'owner', limit: 30 });
  const shared = useQuery(api.splitBills.list, { role: 'participant', limit: 30 });
  if (!owned || !shared) return <LoadingState label="Loading split bills" />;

  return (
    <Page
      title="Split bills"
      action={<Button size="sm" onPress={() => router.push('/create-split' as never)}>New</Button>}
    >
      <ContentHandoff>
        {shared.length ? (
          <View className="gap-2">
            <Text size="lg" weight="semibold">Your shares</Text>
            <Card className="overflow-hidden">
              {shared.map((bill, index) => (
                <View key={bill.id}>
                  {index ? <View className="h-px bg-border" /> : null}
                  <SplitRow bill={bill} onPress={() => router.push(`/split/${bill.id}` as never)} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {owned.length ? (
          <View className="gap-2">
            <Text size="lg" weight="semibold">Created by you</Text>
            <Card className="overflow-hidden">
              {owned.map((bill, index) => (
                <View key={bill.id}>
                  {index ? <View className="h-px bg-border" /> : null}
                  <SplitRow bill={bill} onPress={() => router.push(`/split/${bill.id}` as never)} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {!owned.length && !shared.length ? (
          <MessageCard title="No split bills yet" />
        ) : null}
      </ContentHandoff>
    </Page>
  );
}
