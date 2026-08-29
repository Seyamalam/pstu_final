import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { LoadingState } from '@/components/loading-state';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';
import { createDocumentHtml, exportPdf } from '@/lib/pdf';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <Text muted>{label}</Text>
      <Text weight="medium" className="max-w-[65%] text-right">{value}</Text>
    </View>
  );
}

export default function ReceiptScreen() {
  const params = useLocalSearchParams<{ 'public-id'?: string }>();
  const publicId = typeof params['public-id'] === 'string' ? params['public-id'] : '';
  const receipt = useQuery(api.receipts.getByPublicId, publicId ? { publicId } : 'skip');
  if (receipt === undefined) return <LoadingState />;
  if (!receipt) return null;
  const currentReceipt = receipt;

  async function download() {
    const html = createDocumentHtml({
      title: 'Payment receipt',
      subtitle: currentReceipt.publicId,
      rows: [
        { label: 'Amount', value: formatMoney(currentReceipt.amountPoisha) },
        { label: 'From', value: `${currentReceipt.sender.displayName} (@${currentReceipt.sender.handle})` },
        { label: 'To', value: `${currentReceipt.recipient.displayName} (@${currentReceipt.recipient.handle})` },
        { label: 'Date', value: formatDate(currentReceipt.createdAt) },
        ...(currentReceipt.note ? [{ label: 'Note', value: currentReceipt.note }] : []),
      ],
    });
    await exportPdf(html, 'Payment receipt');
  }

  return (
    <Page>
      <View className="items-center gap-1 py-3">
        <Text muted>Paid</Text>
        <Text size="3xl" weight="bold">{formatMoney(receipt.amountPoisha)}</Text>
      </View>
      <Card>
        <Card.Content className="pt-6">
          <Detail label="From" value={`${receipt.sender.displayName} · @${receipt.sender.handle}`} />
          <Detail label="To" value={`${receipt.recipient.displayName} · @${receipt.recipient.handle}`} />
          <Detail label="Date" value={formatDate(receipt.createdAt)} />
          {receipt.note ? <Detail label="Note" value={receipt.note} /> : null}
          <Detail label="Receipt" value={receipt.publicId} />
        </Card.Content>
      </Card>
      <Button fullWidth onPress={download}>Export PDF</Button>
    </Page>
  );
}
