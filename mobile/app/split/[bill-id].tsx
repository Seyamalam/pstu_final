import { useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { View } from 'react-native';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { SuccessState } from '@/components/success-state';
import { confirmPayment } from '@/lib/biometrics';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney, parseTakaToPoisha, poishaToTakaInput } from '@/lib/format';
import { isSafeReference } from '@/lib/inbox-state';
import {
  contributionFingerprint,
  remainingShare,
  splitIntent,
  validContribution,
  type SplitIntent,
} from '@/lib/split-state';

export default function SplitDetailScreen() {
  const params = useLocalSearchParams<{ 'bill-id'?: string }>();
  const billId = typeof params['bill-id'] === 'string' && isSafeReference(params['bill-id'])
    ? params['bill-id']
    : null;
  const bill = useQuery(api.splitBills.get, billId ? { billId: billId as never } : 'skip');
  const dashboard = useQuery(api.dashboard.get, {});
  const wallets = useQuery(api.wallets.list, {});
  const contribute = useMutation(api.splitBills.contribute);
  const settle = useMutation(api.splitBills.settle);
  const intentRef = useRef<SplitIntent | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settling, setSettling] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [receiptPublicId, setReceiptPublicId] = useState<string | null>(null);
  const [completedAmount, setCompletedAmount] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);

  if (!billId) {
    return <Page><MessageCard title="Split bill not found" /></Page>;
  }
  if (!bill || !dashboard || !wallets) return <LoadingState label="Loading split" />;
  const currentBill = bill;
  const activeWallet = wallets.contexts.find((wallet) => wallet.accountId === wallets.activeAccountId)
    ?? wallets.contexts[0];
  const receivingWallet = wallets.contexts.find(
    (wallet) => wallet.accountId === currentBill.receivingAccountId,
  );
  const participant = currentBill.participants.find(
    (item) => item.user.id === dashboard.user.id,
  );
  const participantRemaining = participant
    ? remainingShare(participant.sharePoisha, participant.contributedPoisha)
    : 0n;
  const billRemaining = remainingShare(
    currentBill.totalPoisha,
    currentBill.contributedTotalPoisha,
  );
  const canSettle = currentBill.creator.id === dashboard.user.id || (
    receivingWallet?.kind === 'organization'
    && (receivingWallet.role === 'owner' || receivingWallet.role === 'admin')
  );
  const allPaid = currentBill.participants.every((item) => item.status === 'paid');

  async function submitContribution() {
    setError(null);
    if (!participant || currentBill.status !== 'open') {
      setError('This split cannot accept a contribution.');
      return;
    }
    if (!validContribution(amountPoisha, participantRemaining)) {
      setError(`Enter an amount up to ${formatMoney(participantRemaining)}.`);
      return;
    }
    if (amountPoisha! > activeWallet.balancePoisha) {
      setError('Insufficient balance.');
      return;
    }
    if (activeWallet.accountId === currentBill.receivingAccountId) {
      setError('Choose another wallet before contributing.');
      return;
    }
    if (activeWallet.role === 'viewer') {
      setError('Choose a wallet you can pay from.');
      return;
    }
    const fingerprint = contributionFingerprint(currentBill.id, amountPoisha!);
    const intent = splitIntent(intentRef.current, fingerprint, () => Crypto.randomUUID());
    intentRef.current = intent;
    setSubmitting(true);
    try {
      const confirmation = await confirmPayment();
      if (!confirmation.ok) {
        setError(confirmation.reason === 'unavailable'
          ? 'Payment confirmation is unavailable.'
          : 'Contribution cancelled.');
        return;
      }
      const result = await contribute({
        billId: currentBill.id,
        amountPoisha: amountPoisha!,
        idempotencyKey: intent.idempotencyKey,
      });
      setCompletedAmount(amountPoisha!);
      setReceiptPublicId(result.receipt.publicId);
      setAmount('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Contribution failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function settleBill() {
    if (!confirmSettle) {
      setConfirmSettle(true);
      return;
    }
    setSettling(true);
    setError(null);
    try {
      await settle({ billId: currentBill.id });
      setConfirmSettle(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not settle split.');
    } finally {
      setSettling(false);
    }
  }

  if (receiptPublicId && completedAmount !== null) {
    return (
      <Page title="Contribution sent">
        <SuccessState title={formatMoney(completedAmount)} detail={currentBill.title} />
        <Button fullWidth onPress={() => router.push(`/receipt/${receiptPublicId}`)}>View receipt</Button>
        <Button
          fullWidth
          variant="outline"
          onPress={() => {
            setReceiptPublicId(null);
            setCompletedAmount(null);
          }}
        >
          Back to split
        </Button>
      </Page>
    );
  }

  return (
    <Page title={currentBill.title}>
      <Card>
        <Card.Header>
          <Text muted>{currentBill.status === 'open' ? 'Open split' : 'Settled'}</Text>
          <Text size="3xl" weight="bold">{formatMoney(currentBill.totalPoisha)}</Text>
          <Text muted size="sm">
            {formatMoney(currentBill.contributedTotalPoisha)} collected · {formatMoney(billRemaining)} left
          </Text>
        </Card.Header>
      </Card>

      <View className="gap-2">
        <Text size="lg" weight="semibold">People</Text>
        <Card className="overflow-hidden">
          {currentBill.participants.map((item, index) => {
            const remaining = remainingShare(item.sharePoisha, item.contributedPoisha);
            return (
              <View key={item.id}>
                {index ? <View className="h-px bg-border" /> : null}
                <Item size="sm">
                  <Item.Content>
                    <Item.Title>{item.user.displayName}</Item.Title>
                    <Item.Description>@{item.user.handle}</Item.Description>
                  </Item.Content>
                  <Item.Actions className="items-end gap-0.5">
                    <Text weight="semibold">{formatMoney(item.sharePoisha)}</Text>
                    <Text muted size="xs">
                      {remaining > 0n ? `${formatMoney(remaining)} left` : 'Paid'}
                    </Text>
                  </Item.Actions>
                </Item>
              </View>
            );
          })}
        </Card>
      </View>

      {participant && participantRemaining > 0n && currentBill.status === 'open' ? (
        <Card>
          <Card.Header>
            <Card.Title>Your contribution</Card.Title>
            <Card.Description>From {activeWallet.name}</Card.Description>
          </Card.Header>
          <Card.Content className="gap-3">
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount in BDT"
              keyboardType="decimal-pad"
              disabled={submitting}
              accessibilityLabel="Split contribution amount in BDT"
            />
            <Button
              size="sm"
              variant="ghost"
              className="min-h-12"
              disabled={submitting}
              onPress={() => setAmount(poishaToTakaInput(participantRemaining))}
            >
              Fill remaining {formatMoney(participantRemaining)}
            </Button>
            <Button fullWidth disabled={submitting} onPress={() => void submitContribution()}>
              {submitting ? 'Contributing' : 'Contribute'}
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {canSettle && currentBill.status === 'open' ? (
        <Button
          fullWidth
          variant={confirmSettle ? 'primary' : 'outline'}
          disabled={!allPaid || settling}
          onPress={() => void settleBill()}
        >
          {settling ? 'Settling' : confirmSettle ? 'Confirm settlement' : 'Settle split'}
        </Button>
      ) : null}
      {currentBill.status === 'settled' && currentBill.settledAt ? (
        <Text muted size="sm">Settled {formatDate(currentBill.settledAt)}</Text>
      ) : null}
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
    </Page>
  );
}
