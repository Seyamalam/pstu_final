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

import { LoadingState } from '@/components/loading-state';
import { Page } from '@/components/page';
import { RecipientShortcuts } from '@/components/recipient-shortcuts';
import { SuccessState } from '@/components/success-state';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney, parseTakaToPoisha } from '@/lib/format';
import { uniqueRecentRecipients } from '@/lib/recipient-state';
import {
  scheduleFingerprint,
  scheduleIntent,
  scheduleTime,
  type ScheduleIntent,
  type SchedulePreset,
} from '@/lib/schedule-state';

const PRESETS: Array<{ id: SchedulePreset; label: string }> = [
  { id: 'one_hour', label: 'In 1 hour' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'next_week', label: 'Next week' },
];

export default function ScheduleTransferScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  const wallets = useQuery(api.wallets.list, {});
  const favorites = useQuery(api.favorites.list, { limit: 20 });
  const categories = useQuery(api.budgets.listCategories, {});
  const create = useMutation(api.scheduledTransfers.create);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [preset, setPreset] = useState<SchedulePreset>('tomorrow');
  const [executeAt, setExecuteAt] = useState(() => scheduleTime(Date.now(), 'tomorrow'));
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intentRef = useRef<ScheduleIntent | null>(null);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);
  const normalizedRecipient = recipient.trim().replace(/^@/, '').toLowerCase();
  const search = useQuery(
    api.users.search,
    /^[a-z0-9_]{1,24}$/.test(normalizedRecipient) ? { handlePrefix: normalizedRecipient } : 'skip',
  );

  if (!dashboard || !wallets || !favorites || !categories) {
    return <LoadingState label="Loading schedule" />;
  }
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const recent = uniqueRecentRecipients(
    dashboard.recentActivity.map((entry) => entry.counterparty),
    dashboard.user.handle,
  );

  async function submit() {
    setError(null);
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedRecipient)) {
      setError('Choose a valid recipient.');
      return;
    }
    if (!amountPoisha || amountPoisha > active.balancePoisha) {
      setError(amountPoisha ? 'Insufficient balance.' : 'Enter a valid amount.');
      return;
    }
    const trimmedNote = note.trim();
    const fingerprint = scheduleFingerprint({
      accountId: active.accountId,
      recipientHandle: normalizedRecipient,
      amountPoisha,
      note: trimmedNote,
      category,
      executeAt,
    });
    const intent = scheduleIntent(intentRef.current, fingerprint, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      const confirmation = await confirmPayment();
      if (!confirmation.ok) {
        setError(confirmation.reason === 'unavailable'
          ? 'Payment confirmation is unavailable.'
          : 'Schedule cancelled.');
        return;
      }
      await create({
        recipientHandle: normalizedRecipient,
        amountPoisha,
        note: trimmedNote || undefined,
        category: category || undefined,
        executeAt,
        idempotencyKey: intent.idempotencyKey,
      });
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not schedule transfer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <Page title="Scheduled">
        <SuccessState title={formatMoney(amountPoisha!)} detail={formatDate(executeAt)} />
        <Button fullWidth onPress={() => router.replace('/scheduled-transfers' as never)}>Done</Button>
      </Page>
    );
  }

  return (
    <Page title="Schedule transfer">
      <Card>
        <Card.Content className="gap-4 pt-6">
          <RecipientShortcuts
            favorites={favorites.map((favorite) => favorite.recipient)}
            recent={recent}
            onSelect={(user) => setRecipient(user.handle)}
          />
          <Input
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Recipient handle"
            autoCapitalize="none"
            autoCorrect={false}
            disabled={submitting}
            accessibilityLabel="Recipient handle"
          />
          {search?.length && !search.some((user) => user.handle === normalizedRecipient) ? (
            <View className="rounded-xl bg-muted">
              {search.slice(0, 4).map((user) => (
                <Item key={user.id} size="xs" onPress={() => setRecipient(user.handle)}>
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

      <View className="gap-2">
        <Text size="sm" weight="semibold">When</Text>
        <View className="flex-row flex-wrap gap-2">
          {PRESETS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              className="min-h-12"
              variant={preset === option.id ? 'primary' : 'outline'}
              onPress={() => {
                setPreset(option.id);
                setExecuteAt(scheduleTime(Date.now(), option.id));
              }}
            >
              {option.label}
            </Button>
          ))}
        </View>
        <Text muted size="sm">{formatDate(executeAt)}</Text>
      </View>

      <View className="gap-2">
        <Text size="sm" weight="semibold">Category</Text>
        <View className="flex-row flex-wrap gap-2">
          <Button
            size="sm"
            className="min-h-12"
            variant={!category ? 'primary' : 'outline'}
            onPress={() => setCategory('')}
          >
            None
          </Button>
          {categories.map((option) => (
            <Button
              key={option}
              size="sm"
              className="min-h-12"
              variant={category === option ? 'primary' : 'outline'}
              onPress={() => setCategory(option)}
            >
              {option}
            </Button>
          ))}
        </View>
      </View>

      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button fullWidth disabled={submitting} onPress={() => void submit()}>
        {submitting ? 'Scheduling' : 'Schedule transfer'}
      </Button>
    </Page>
  );
}
