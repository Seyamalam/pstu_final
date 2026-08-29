import { useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { RecipientShortcuts, type RecipientShortcut } from '@/components/recipient-shortcuts';
import { api } from '@/lib/convex-api';
import { formatMoney } from '@/lib/format';
import { uniqueRecentRecipients } from '@/lib/recipient-state';
import {
  parseSplitParticipants,
  splitCreateFingerprint,
  splitIntent,
  type SplitIntent,
  type SplitParticipantInput,
} from '@/lib/split-state';

type ParticipantRow = SplitParticipantInput & { id: number };

export default function CreateSplitScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  const wallets = useQuery(api.wallets.list, {});
  const favorites = useQuery(api.favorites.list, { limit: 20 });
  const create = useMutation(api.splitBills.create);
  const nextId = useRef(2);
  const intentRef = useRef<SplitIntent | null>(null);
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<ParticipantRow[]>([{ id: 1, handle: '', amount: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => parseSplitParticipants(rows), [rows]);

  if (!dashboard || !wallets || !favorites) return <LoadingState label="Loading split" />;
  const currentDashboard = dashboard;
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const recent = uniqueRecentRecipients(
    currentDashboard.recentActivity.map((entry) => entry.counterparty),
    currentDashboard.user.handle,
  );

  if (active.role === 'viewer') {
    return (
      <Page title="New split">
        <MessageCard title="View-only wallet" />
      </Page>
    );
  }

  function updateRow(id: number, patch: Partial<SplitParticipantInput>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
    setError(null);
  }

  function addPerson(recipient?: RecipientShortcut) {
    if (rows.length >= 20) {
      setError('A split can include up to 20 people.');
      return;
    }
    if (recipient) {
      const handle = recipient.handle.toLowerCase();
      if (rows.some((row) => row.handle.trim().replace(/^@/, '').toLowerCase() === handle)) {
        setError('Each person can appear once.');
        return;
      }
      const blank = rows.find((row) => !row.handle.trim());
      if (blank) {
        updateRow(blank.id, { handle });
        return;
      }
    }
    const id = nextId.current++;
    setRows((current) => [...current, { id, handle: recipient?.handle ?? '', amount: '' }]);
  }

  async function submit() {
    const normalizedTitle = title.trim().replace(/\s+/g, ' ');
    setError(null);
    if (normalizedTitle.length < 2 || normalizedTitle.length > 80) {
      setError('Title must be 2 to 80 characters.');
      return;
    }
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (parsed.participants.some(
      (participant) => participant.handle === currentDashboard.user.handle,
    )) {
      setError('Choose other people for this split.');
      return;
    }
    const fingerprint = splitCreateFingerprint({
      receivingAccountId: active.accountId,
      title: normalizedTitle,
      participants: parsed.participants,
    });
    const intent = splitIntent(intentRef.current, fingerprint, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      const bill = await create({
        title: normalizedTitle,
        participants: parsed.participants,
        idempotencyKey: intent.idempotencyKey,
      });
      router.replace(`/split/${bill.id}` as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create split.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="New split">
      <Text muted size="sm">Collect to {active.name}</Text>
      <Card>
        <Card.Content className="gap-4 pt-6">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            maxLength={80}
            disabled={submitting}
            accessibilityLabel="Split bill title"
          />
          <RecipientShortcuts
            favorites={favorites.map((favorite) => favorite.recipient)}
            recent={recent}
            onSelect={addPerson}
          />
        </Card.Content>
      </Card>

      <View className="gap-3">
        {rows.map((row, index) => (
          <Card key={row.id}>
            <Card.Content className="gap-3 pt-6">
              <Text size="sm" weight="semibold">Person {index + 1}</Text>
              <Input
                value={row.handle}
                onChangeText={(value) => updateRow(row.id, { handle: value })}
                placeholder="Handle"
                autoCapitalize="none"
                autoCorrect={false}
                disabled={submitting}
                accessibilityLabel={`Person ${index + 1} handle`}
              />
              <Input
                value={row.amount}
                onChangeText={(value) => updateRow(row.id, { amount: value })}
                placeholder="Share in BDT"
                keyboardType="decimal-pad"
                disabled={submitting}
                accessibilityLabel={`Person ${index + 1} share in BDT`}
              />
              {rows.length > 1 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-12"
                  disabled={submitting}
                  onPress={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                >
                  Remove person
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        ))}
      </View>

      <Button
        fullWidth
        variant="outline"
        disabled={submitting || rows.length >= 20}
        onPress={() => addPerson()}
      >
        Add person
      </Button>
      {parsed.ok ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text muted>Total</Text>
          <Text weight="semibold">{formatMoney(parsed.totalPoisha)}</Text>
        </View>
      ) : null}
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button fullWidth disabled={submitting} onPress={() => void submit()}>
        {submitting ? 'Creating' : 'Create split'}
      </Button>
    </Page>
  );
}
