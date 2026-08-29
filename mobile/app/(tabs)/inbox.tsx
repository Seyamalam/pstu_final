import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { RequestRow } from '@/components/request-row';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/format';
import { inboxCopy, inboxRoute } from '@/lib/inbox-state';

export default function InboxScreen() {
  const notifications = useQuery(api.notifications.list, { limit: 30 });
  const incoming = useQuery(api.requests.list, { role: 'payer', status: 'pending', limit: 10 });
  const outgoing = useQuery(api.requests.list, { role: 'requester', status: 'pending', limit: 10 });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  if (notifications === undefined || incoming === undefined || outgoing === undefined) {
    return <LoadingState label="Loading inbox" />;
  }
  const unread = notifications.filter((item) => item.readAt === null).length;

  async function openNotification(notification: NonNullable<typeof notifications>[number]) {
    if (notification.readAt === null) {
      await markRead({ notificationId: notification.id });
    }
    router.push(inboxRoute(notification) as never);
  }

  return (
    <Page
      title="Inbox"
      safeTop
      action={unread ? (
        <Button size="sm" variant="ghost" onPress={() => void markAllRead({})}>Mark all read</Button>
      ) : null}
    >
      <View className="flex-row gap-3">
        <Button className="flex-1" onPress={() => router.push('/request-money' as never)}>Request money</Button>
        <Button className="flex-1" variant="outline" onPress={() => router.push('/request-code' as never)}>
          Request QR
        </Button>
      </View>

      {incoming.length ? (
        <View className="gap-2">
          <Text size="lg" weight="semibold">For you</Text>
          <Card className="overflow-hidden">
            {incoming.map((request, index) => (
              <View key={request.id}>
                {index ? <View className="h-px bg-border" /> : null}
                <RequestRow
                  request={request}
                  perspective="payer"
                  onPress={() => router.push(`/request/${request.id}` as never)}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {outgoing.length ? (
        <View className="gap-2">
          <Text size="lg" weight="semibold">Sent requests</Text>
          <Card className="overflow-hidden">
            {outgoing.map((request, index) => (
              <View key={request.id}>
                {index ? <View className="h-px bg-border" /> : null}
                <RequestRow
                  request={request}
                  perspective="requester"
                  onPress={() => router.push(`/request/${request.id}` as never)}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View className="gap-2">
        <Text size="lg" weight="semibold">Updates</Text>
        {notifications.length ? (
          <Card className="overflow-hidden">
            {notifications.map((notification, index) => {
              const copy = inboxCopy(notification.eventKey);
              return (
                <View key={notification.id}>
                  {index ? <View className="h-px bg-border" /> : null}
                  <Item size="sm" onPress={() => void openNotification(notification)}>
                    <Item.Content>
                      <Item.Title>{copy.title}</Item.Title>
                      <Item.Description>{copy.detail}</Item.Description>
                    </Item.Content>
                    <Item.Actions className="items-end gap-1">
                      {notification.readAt === null ? (
                        <View className="h-2.5 w-2.5 rounded-full bg-primary" accessibilityLabel="Unread" />
                      ) : null}
                      <Text muted size="xs">{formatDate(notification.createdAt)}</Text>
                    </Item.Actions>
                  </Item>
                </View>
              );
            })}
          </Card>
        ) : (
          <MessageCard title="You're all caught up" />
        )}
      </View>
    </Page>
  );
}
