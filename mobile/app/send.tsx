import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { Card } from 'panelui-native/components/card';
import { Button } from 'panelui-native/components/button';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { SlideButton } from 'panelui-native/components/slide-button';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { Page } from '@/components/page';
import { RecipientShortcuts } from '@/components/recipient-shortcuts';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatMoney, parseTakaToPoisha } from '@/lib/format';
import {
  paymentFingerprint,
  paymentIntent,
  type PaymentIntent,
} from '@/lib/payment-intent';
import { isFavoriteHandle, uniqueRecentRecipients } from '@/lib/recipient-state';

export default function SendScreen() {
  const params = useLocalSearchParams<{ recipient?: string; amount?: string; note?: string }>();
  const initialRecipient = typeof params.recipient === 'string' ? params.recipient : '';
  const initialAmount = typeof params.amount === 'string' ? params.amount : '';
  const initialNote = typeof params.note === 'string' ? params.note : '';
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const intentRef = useRef<PaymentIntent | null>(null);
  const dashboard = useQuery(api.dashboard.get, {});
  const favorites = useQuery(api.favorites.list, { limit: 20 });
  const normalizedRecipient = recipient.trim().replace(/^@/, '').toLowerCase();
  const search = useQuery(
    api.users.search,
    /^[a-z0-9_]{1,24}$/.test(normalizedRecipient)
      ? { handlePrefix: normalizedRecipient }
      : 'skip',
  );
  const send = useMutation(api.transfers.send);
  const toggleFavorite = useMutation(api.favorites.toggle);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);

  if (dashboard === undefined) return <LoadingState />;
  const currentDashboard = dashboard;
  const recentRecipients = uniqueRecentRecipients(
    currentDashboard.recentActivity.map((entry) => entry.counterparty),
    currentDashboard.user.handle,
  );
  const favoriteRecipients = favorites?.map((favorite) => favorite.recipient) ?? [];
  const selectedRecipient = [
    ...favoriteRecipients,
    ...recentRecipients,
    ...(search ?? []),
  ].find((user) => user.handle === normalizedRecipient);

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

  async function toggleSelectedFavorite() {
    if (!selectedRecipient) return;
    setError(null);
    try {
      await toggleFavorite({ recipientHandle: selectedRecipient.handle });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update favorite.');
    }
  }

  return (
    <Page>
      <Card>
        <Card.Content className="gap-4 pt-6">
          <RecipientShortcuts
            favorites={favoriteRecipients}
            recent={recentRecipients}
            onSelect={(user) => setRecipient(user.handle)}
          />
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
          {selectedRecipient ? (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-12"
              onPress={() => void toggleSelectedFavorite()}
            >
              {isFavoriteHandle(favorites ?? [], selectedRecipient.handle)
                ? 'Remove favorite'
                : 'Add favorite'}
            </Button>
          ) : null}
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
