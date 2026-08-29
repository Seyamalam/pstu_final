import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatMoney, parseTakaToPoisha } from '@/lib/format';
import {
  normalizeRailReference,
  providerById,
  providersByKind,
  railFingerprint,
  railIntent,
  referenceLabel,
  type RailDirection,
  type RailIntent,
  type RailProviderKind,
} from '@/lib/rail-flow';

const PROVIDER_GROUPS: Array<{ kind: RailProviderKind; label: string }> = [
  { kind: 'mfs', label: 'Mobile wallet' },
  { kind: 'bank', label: 'Bank' },
  { kind: 'card', label: 'Card' },
];

export function RailTransferScreen({ direction }: { direction: RailDirection }) {
  const wallets = useQuery(api.wallets.list, {});
  const serverProviders = useQuery(api.rails.listProviders, {});
  const cashIn = useMutation(api.rails.cashIn);
  const cashOut = useMutation(api.rails.cashOut);
  const [providerId, setProviderId] = useState('bkash');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedBalance, setCompletedBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intentRef = useRef<RailIntent | null>(null);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);
  const provider = providerById(providerId);
  const normalizedReference = provider
    ? normalizeRailReference(provider, reference)
    : null;

  if (wallets === undefined || serverProviders === undefined) return <LoadingState />;
  const active = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const title = direction === 'cash_in' ? 'Add money' : 'Withdraw';
  const actionLabel = direction === 'cash_in' ? 'Add' : 'Withdraw';
  const supportedIds = new Set<string>(serverProviders.map((item) => item.id));

  function beginReview() {
    setError(null);
    if (!provider || !supportedIds.has(provider.id)) {
      setError('Choose a supported provider.');
      return;
    }
    if (!normalizedReference) {
      setError(`Enter a valid ${referenceLabel(provider.kind).toLowerCase()}.`);
      return;
    }
    if (!amountPoisha || amountPoisha > 50_000_000n) {
      setError('Enter an amount up to ৳500,000.');
      return;
    }
    if (direction === 'cash_out' && amountPoisha > active.balancePoisha) {
      setError('Insufficient balance.');
      return;
    }
    setReviewing(true);
  }

  async function submit() {
    if (!provider || !normalizedReference || !amountPoisha) return;
    setError(null);
    const fingerprint = railFingerprint({
      accountId: active.accountId,
      direction,
      providerId: provider.id,
      amountPoisha,
      reference: normalizedReference.normalized,
    });
    const intent = railIntent(intentRef.current, fingerprint, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      if (direction === 'cash_out') {
        const confirmation = await confirmPayment();
        if (!confirmation.ok) {
          setError(
            confirmation.reason === 'unavailable'
              ? 'Payment confirmation is unavailable.'
              : 'Withdrawal cancelled.',
          );
          return;
        }
      }
      const input = {
        accountId: active.accountId,
        provider: provider.id,
        amountPoisha,
        reference: normalizedReference.normalized,
        idempotencyKey: intent.idempotencyKey,
      };
      const transaction = direction === 'cash_in'
        ? await cashIn(input)
        : await cashOut(input);
      setCompletedBalance(transaction.balanceAfterPoisha);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${title} failed.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (active.role === 'viewer') {
    return (
      <Page>
        <MessageCard title="View-only wallet" />
        <Button variant="outline" fullWidth onPress={() => router.back()}>Back</Button>
      </Page>
    );
  }

  if (completedBalance !== null) {
    return (
      <Page>
        <Text size="2xl" weight="bold">Completed</Text>
        <Card>
          <Card.Header>
            <Text muted>{direction === 'cash_in' ? 'Money added' : 'Money withdrawn'}</Text>
            <Text size="3xl" weight="bold">{formatMoney(amountPoisha!)}</Text>
            <Text size="sm" muted>{provider?.name} · {normalizedReference?.masked}</Text>
          </Card.Header>
          <Card.Content className="flex-row items-center justify-between">
            <Text muted>Balance</Text>
            <Text weight="semibold">{formatMoney(completedBalance)}</Text>
          </Card.Content>
        </Card>
        <Button fullWidth onPress={() => router.replace('/(tabs)/home')}>Done</Button>
      </Page>
    );
  }

  if (reviewing && provider && normalizedReference && amountPoisha) {
    return (
      <Page>
        <Text size="2xl" weight="bold">Review</Text>
        <Card className="overflow-hidden">
          <Item>
            <Item.Content>
              <Item.Title>{active.name}</Item.Title>
              <Item.Description>{direction === 'cash_in' ? 'To wallet' : 'From wallet'}</Item.Description>
            </Item.Content>
          </Item>
          <View className="h-px bg-border" />
          <Item>
            <Item.Content>
              <Item.Title>{provider.name}</Item.Title>
              <Item.Description>{normalizedReference.masked}</Item.Description>
            </Item.Content>
          </Item>
          <View className="h-px bg-border" />
          <Item>
            <Item.Content>
              <Item.Title>{formatMoney(amountPoisha)}</Item.Title>
              <Item.Description>Amount</Item.Description>
            </Item.Content>
          </Item>
        </Card>
        {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
        <Button disabled={submitting} fullWidth onPress={() => void submit()}>
          {submitting ? 'Processing' : `Confirm ${actionLabel.toLowerCase()}`}
        </Button>
        <Button disabled={submitting} variant="ghost" fullWidth onPress={() => setReviewing(false)}>
          Edit
        </Button>
      </Page>
    );
  }

  return (
    <Page>
      <Card>
        <Card.Header>
          <Text weight="semibold">{active.name}</Text>
          <Text muted size="sm">Balance {formatMoney(active.balancePoisha)}</Text>
        </Card.Header>
      </Card>

      {PROVIDER_GROUPS.map((group) => (
        <View key={group.kind} className="gap-2">
          <Text size="sm" weight="semibold">{group.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {providersByKind(group.kind).filter((item) => supportedIds.has(item.id)).map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === providerId ? 'primary' : 'outline'}
                onPress={() => {
                  setProviderId(item.id);
                  setReference('');
                  setError(null);
                }}
              >
                {item.name}
              </Button>
            ))}
          </View>
        </View>
      ))}

      {provider ? (
        <Input
          value={reference}
          onChangeText={setReference}
          placeholder={referenceLabel(provider.kind)}
          keyboardType={provider.kind === 'bank' ? 'default' : 'number-pad'}
          autoCapitalize={provider.kind === 'bank' ? 'characters' : 'none'}
          autoCorrect={false}
          accessibilityLabel={referenceLabel(provider.kind)}
        />
      ) : null}
      <Input
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount in BDT"
        keyboardType="decimal-pad"
        accessibilityLabel="Amount in BDT"
      />
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button fullWidth onPress={beginReview}>Review</Button>
    </Page>
  );
}
