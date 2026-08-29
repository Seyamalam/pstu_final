import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';

export default function ScheduledTransfersScreen() {
  const schedules = useQuery(api.scheduledTransfers.list, { limit: 30 });
  const cancel = useMutation(api.scheduledTransfers.cancel);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (schedules === undefined) return <LoadingState label="Loading schedules" />;

  async function cancelSchedule(schedule: NonNullable<typeof schedules>[number]) {
    setCancellingId(schedule.id);
    setError(null);
    try {
      await cancel({ scheduledTransferId: schedule.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel transfer.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <Page
      title="Scheduled"
      action={<Button size="sm" onPress={() => router.push('/schedule-transfer' as never)}>New</Button>}
    >
      {schedules.length ? (
        <Card className="overflow-hidden">
          {schedules.map((schedule, index) => (
            <View key={schedule.id}>
              {index ? <View className="h-px bg-border" /> : null}
              <Item size="sm">
                <Item.Content>
                  <Item.Title>{schedule.recipient.displayName}</Item.Title>
                  <Item.Description>
                    {schedule.status === 'pending'
                      ? formatDate(schedule.executeAt)
                      : schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                  </Item.Description>
                </Item.Content>
                <Item.Actions className="items-end gap-1">
                  <Text weight="semibold">{formatMoney(schedule.amountPoisha)}</Text>
                  {schedule.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-12"
                      disabled={cancellingId !== null}
                      onPress={() => void cancelSchedule(schedule)}
                    >
                      {cancellingId === schedule.id ? 'Cancelling' : 'Cancel'}
                    </Button>
                  ) : schedule.transferPublicId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-12"
                      onPress={() => router.push(`/receipt/${schedule.transferPublicId}`)}
                    >
                      Receipt
                    </Button>
                  ) : null}
                </Item.Actions>
              </Item>
            </View>
          ))}
        </Card>
      ) : (
        <MessageCard title="No scheduled transfers" />
      )}
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
    </Page>
  );
}
