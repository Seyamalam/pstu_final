import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { SlideButton } from 'panelui-native/components/slide-button';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { Page } from '@/components/page';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatMoney, parseTakaToPoisha } from '@/lib/format';
import {
  paymentFingerprint,
  paymentIntent,
  type PaymentIntent,
} from '@/lib/payment-intent';

export default function SendScreen() {
  const params = useLocalSearchParams<{ recipient?: string }>();
  const initialRecipient = typeof params.recipient === 'string' ? params.recipient : '';
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const intentRef = useRef<PaymentIntent | null>(null);
  const dashboard = useQuery(api.dashboard.get, {});
  const normalizedRecipient = recipient.trim().replace(/^@/, '').toLowerCase();
  const search = useQuery(
    api.users.search,
    /^[a-z0-9_]{1,24}$/.test(normalizedRecipient)
      ? { handlePrefix: normalizedRecipient }
      : 'skip',
  );
  const send = useMutation(api.transfers.send);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);

  if (dashboard === undefined) return <LoadingState />;
  const currentDashboard = dashboard;

  async function submit() {
    setError(null);
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedRecipient)) {
      setError('Choose a valid recipient.');
      return;
    }
    if (!amountPoisha) {
      setError('Enter a valid amount.');
      return;
    }
    if (amountPoisha > currentDashboard.account.balancePoisha) {
      setError('Insufficient balance.');
      return;
    }

    const trimmedNote = note.trim();
    const fingerprint = paymentFingerprint({
      recipientHandle: normalizedRecipient,
      amountPoisha,
      note: trimmedNote,
    });
    const intent = paymentIntent(intentRef.current, fingerprint, () =>
      Crypto.randomUUID(),
    );
    intentRef.current = intent;

    setSubmitting(true);
    try {
      const confirmation = await confirmPayment();
      if (!confirmation.ok) {
        setError(
          confirmation.reason === 'unavailable'
            ? 'Payment confirmation is unavailable.'
            : 'Payment cancelled.',
        );
        return;
      }
      const receipt = await send({
        recipientHandle: normalizedRecipient,
        amountPoisha,
        note: trimmedNote || undefined,
        idempotencyKey: intent.idempotencyKey,
      });
      router.replace({
        pathname: '/receipt/[public-id]',
        params: { 'public-id': receipt.publicId },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <Card>
        <Card.Content className="gap-4 pt-6">
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Recipient handle"
            value={recipient}
            onChangeText={setRecipient}
            disabled={submitting}
            accessibilityLabel="Recipient handle"
          />
          {search && search.length && !search.some((user) => user.handle === normalizedRecipient) ? (
            <View className="rounded-xl bg-muted">
              {search.slice(0, 4).map((user) => (
                <Item
                  key={user.id}
                  size="xs"
                  disabled={submitting}
                  onPress={() => setRecipient(user.handle)}
                >
                  <Item.Content>
                    <Item.Title>{user.displayName}</Item.Title>
                    <Item.Description>@{user.handle}</Item.Description>
                  </Item.Content>
                </Item>
              ))}
            </View>
          ) : null}
          <Input
            keyboardType="decimal-pad"
            placeholder="Amount in BDT"
            value={amount}
            onChangeText={setAmount}
            disabled={submitting}
            accessibilityLabel="Amount in BDT"
          />
          <Input
            maxLength={120}
            placeholder="Note (optional)"
            value={note}
            onChangeText={setNote}
            disabled={submitting}
            accessibilityLabel="Note"
          />
          <View className="flex-row justify-between gap-3">
            <Text muted>Available</Text>
            <Text weight="semibold">{formatMoney(currentDashboard.account.balancePoisha)}</Text>
          </View>
        </Card.Content>
      </Card>
      {error ? <Text className="text-destructive" size="sm">{error}</Text> : null}
      <SlideButton
        fullWidth
        haptics
        autoReset
        disabled={submitting}
        accessibilityActionLabel="Send payment"
        onComplete={submit}
      >
        <SlideButton.Label>
          {submitting
            ? 'Sending'
            : amountPoisha
              ? `Slide to send ${formatMoney(amountPoisha)}`
              : 'Slide to send'}
        </SlideButton.Label>
      </SlideButton>
    </Page>
  );
}
