import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Input } from 'panelui-native/components/input';
import { QRCode } from 'panelui-native/components/qr-code';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatMoney, parseTakaToPoisha } from '@/lib/format';
import { tryBuildRequestCode } from '@/lib/qr';

export default function RequestCodeScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const amountPoisha = useMemo(() => parseTakaToPoisha(amount), [amount]);
  const payload = dashboard && amountPoisha
    ? tryBuildRequestCode({ handle: dashboard.user.handle, amountPoisha, note })
    : null;

  if (dashboard === undefined) return <LoadingState label="Loading request" />;

  async function share() {
    if (!payload || !amountPoisha) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    await Share.share({
      title: 'Payment request',
      message: `${formatMoney(amountPoisha)}${note.trim() ? ` · ${note.trim()}` : ''}\n${payload}`,
    });
  }

  return (
    <Page title="Request QR">
      <Card>
        <Card.Content className="gap-4 pt-6">
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount in BDT"
            keyboardType="decimal-pad"
            accessibilityLabel="Amount in BDT"
          />
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            maxLength={120}
            accessibilityLabel="Note"
          />
        </Card.Content>
      </Card>
      {payload && amountPoisha ? (
        <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <QRCode value={payload} size="lg" errorCorrection="M">
            <QRCode.Canvas />
            <QRCode.Caption>{formatMoney(amountPoisha)}</QRCode.Caption>
          </QRCode>
          {note.trim() ? <Text muted size="sm">{note.trim()}</Text> : null}
        </View>
      ) : null}
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
      <Button fullWidth disabled={!payload} onPress={() => void share()}>Share request</Button>
    </Page>
  );
}
