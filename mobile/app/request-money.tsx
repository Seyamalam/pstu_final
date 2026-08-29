import { useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { Page } from '@/components/page';
import { RecipientShortcuts } from '@/components/recipient-shortcuts';
import { SuccessState } from '@/components/success-state';
import { api } from '@/lib/convex-api';
import { formatMoney, parseTakaToPoisha } from '@/lib/format';
import { paymentFingerprint, paymentIntent, type PaymentIntent } from '@/lib/payment-intent';
import { uniqueRecentRecipients } from '@/lib/recipient-state';

export default function RequestMoneyScreen() {
  const [payer, setPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intentRef = useRef<PaymentIntent | null>(null);
  const create = useMutation(api.requests.create);
  const dashboard = useQuery(api.dashboard.get, {});
  const favorites = useQuery(api.favorites.list, { limit: 20 });
  const normalizedPayer = payer.trim().replace(/^@/, '').toLowerCase();
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);
  const search = useQuery(
    api.users.search,
    /^[a-z0-9_]{1,24}$/.test(normalizedPayer) ? { handlePrefix: normalizedPayer } : 'skip',
  );
  const recentRecipients = dashboard
    ? uniqueRecentRecipients(
      dashboard.recentActivity.map((entry) => entry.counterparty),
      dashboard.user.handle,
    )
    : [];

  async function submit() {
    setError(null);
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedPayer)) {
      setError('Choose a valid payer.');
      return;
    }
    if (!amountPoisha) {
      setError('Enter a valid amount.');
      return;
    }
    const trimmedNote = note.trim();
    const fingerprint = paymentFingerprint({
      recipientHandle: normalizedPayer,
      amountPoisha,
      note: trimmedNote,
    });
    const intent = paymentIntent(intentRef.current, `request\u0000${fingerprint}`, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      await create({
        payerHandle: normalizedPayer,
        amountPoisha,
        note: trimmedNote || undefined,
        idempotencyKey: intent.idempotencyKey,
      });
      setCreated(amountPoisha);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created !== null) {
    return (
      <Page title="Requested">
        <SuccessState title={formatMoney(created)} detail={`Requested from @${normalizedPayer}`} />
        <Button fullWidth onPress={() => router.replace('/(tabs)/inbox' as never)}>Done</Button>
      </Page>
    );
  }

  return (
    <Page title="Request money">
      <Card>
        <Card.Content className="gap-4 pt-6">
          <RecipientShortcuts
            favorites={favorites?.map((favorite) => favorite.recipient) ?? []}
            recent={recentRecipients}
            onSelect={(user) => setPayer(user.handle)}
          />
          <Input
            value={payer}
            onChangeText={setPayer}
            placeholder="Payer handle"
            autoCapitalize="none"
            autoCorrect={false}
            disabled={submitting}
            accessibilityLabel="Payer handle"
          />
          {search?.length && !search.some((user) => user.handle === normalizedPayer) ? (
            <View className="rounded-xl bg-muted">
              {search.slice(0, 4).map((user) => (
                <Item key={user.id} size="xs" onPress={() => setPayer(user.handle)}>
                  <Item.Content>
                    <Item.Title>{user.displayName}</Item.Title>
                    <Item.Description>@{user.handle}</Item.Description>
                  </Item.Content>
                </Item>
              ))}
            </View>
          ) : null}
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount in BDT"
            keyboardType="decimal-pad"
            disabled={submitting}
            accessibilityLabel="Amount in BDT"
          />
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            maxLength={120}
            disabled={submitting}
            accessibilityLabel="Note"
          />
        </Card.Content>
      </Card>
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button fullWidth disabled={submitting} onPress={() => void submit()}>
        {submitting ? 'Requesting' : amountPoisha ? `Request ${formatMoney(amountPoisha)}` : 'Request'}
      </Button>
    </Page>
  );
}
