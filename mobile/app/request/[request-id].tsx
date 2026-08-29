import { useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { SuccessState } from '@/components/success-state';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';
import { isSafeReference } from '@/lib/inbox-state';
import {
  requestActions,
  requestIntent,
  requestStatusLabel,
  type RequestIntent,
} from '@/lib/request-state';

export default function RequestDetailScreen() {
  const params = useLocalSearchParams<{ 'request-id'?: string }>();
  const requestId = typeof params['request-id'] === 'string' && isSafeReference(params['request-id'])
    ? params['request-id']
    : null;
  const request = useQuery(api.requests.get, requestId ? { requestId: requestId as never } : 'skip');
  const dashboard = useQuery(api.dashboard.get, {});
  const accept = useMutation(api.requests.accept);
  const decline = useMutation(api.requests.decline);
  const cancel = useMutation(api.requests.cancel);
  const intentRef = useRef<RequestIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!requestId) {
    return <Page title="Request"><MessageCard title="Request not found" /></Page>;
  }
  if (request === undefined || dashboard === undefined) return <LoadingState label="Loading request" />;
  const currentRequest = request;

  const actions = requestActions({
    status: currentRequest.status,
    isPayer: currentRequest.payer.id === dashboard.user.id,
    isRequester: currentRequest.requester.id === dashboard.user.id,
    hasReceipt: Boolean(currentRequest.transferPublicId),
  });

  async function pay() {
    setError(null);
    const intent = requestIntent(intentRef.current, currentRequest.id, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      const confirmation = await confirmPayment();
      if (!confirmation.ok) {
        setError(confirmation.reason === 'unavailable'
          ? 'Payment confirmation is unavailable.'
          : 'Payment cancelled.');
        return;
      }
      const receipt = await accept({ requestId: currentRequest.id, idempotencyKey: intent.idempotencyKey });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/receipt/${receipt.publicId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resolve(kind: 'decline' | 'cancel') {
    setError(null);
    setSubmitting(true);
    try {
      if (kind === 'decline') await decline({ requestId: currentRequest.id });
      else await cancel({ requestId: currentRequest.id });
      setCompleted(kind === 'decline' ? 'Request declined' : 'Request cancelled');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request could not be updated.');
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <Page title="Request updated">
        <SuccessState title={completed} />
        <Button fullWidth onPress={() => router.replace('/(tabs)/inbox' as never)}>Done</Button>
      </Page>
    );
  }

  return (
    <Page title="Request">
      <Card className="overflow-hidden">
        <Card.Header>
          <Text muted>{requestStatusLabel(currentRequest.status)}</Text>
          <Text size="3xl" weight="bold">{formatMoney(currentRequest.amountPoisha)}</Text>
          {currentRequest.note ? <Text>{currentRequest.note}</Text> : null}
        </Card.Header>
        <View className="h-px bg-border" />
        <Item>
          <Item.Content>
            <Item.Title>{currentRequest.requester.displayName}</Item.Title>
            <Item.Description>Requester · @{currentRequest.requester.handle}</Item.Description>
          </Item.Content>
        </Item>
        <View className="h-px bg-border" />
        <Item>
          <Item.Content>
            <Item.Title>{currentRequest.payer.displayName}</Item.Title>
            <Item.Description>Payer · @{currentRequest.payer.handle}</Item.Description>
          </Item.Content>
          <Item.Actions><Text muted size="xs">{formatDate(currentRequest.createdAt)}</Text></Item.Actions>
        </Item>
      </Card>
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      {actions.includes('accept') ? (
        <Button fullWidth disabled={submitting} onPress={() => void pay()}>
          {submitting ? 'Paying' : `Pay ${formatMoney(currentRequest.amountPoisha)}`}
        </Button>
      ) : null}
      {actions.includes('decline') ? (
        <Button fullWidth variant="outline" disabled={submitting} onPress={() => void resolve('decline')}>
          Decline
        </Button>
      ) : null}
      {actions.includes('cancel') ? (
        <Button fullWidth variant="outline" disabled={submitting} onPress={() => void resolve('cancel')}>
          Cancel request
        </Button>
      ) : null}
      {actions.includes('receipt') && currentRequest.transferPublicId ? (
        <Button fullWidth onPress={() => router.push(`/receipt/${currentRequest.transferPublicId}`)}>View receipt</Button>
      ) : null}
    </Page>
  );
}
