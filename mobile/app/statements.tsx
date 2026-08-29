import { useRef } from 'react';
import { View } from 'react-native';
import { useQuery } from 'convex/react';
import { Button } from 'panelui-native/components/button';
import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

import { ActivityRow } from '@/components/activity-row';
import { LoadingState } from '@/components/loading-state';
import { MessageCard } from '@/components/message-card';
import { Page } from '@/components/page';
import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';
import { createDocumentHtml, exportPdf } from '@/lib/pdf';

const DAY_MS = 24 * 60 * 60 * 1_000;

export default function StatementsScreen() {
  const toExclusive = useRef(Date.now() + 1).current;
  const fromInclusive = useRef(toExclusive - 30 * DAY_MS).current;
  const statement = useQuery(api.statements.get, { fromInclusive, toExclusive });
  if (statement === undefined) return <LoadingState />;
  const currentStatement = statement;

  async function download() {
    const html = createDocumentHtml({
      title: '30-day statement',
      subtitle: `${formatDate(fromInclusive)} — ${formatDate(toExclusive - 1)}`,
      rows: [
        { label: 'Money in', value: formatMoney(currentStatement.summary.creditTotalPoisha) },
        { label: 'Money out', value: formatMoney(currentStatement.summary.debitTotalPoisha) },
        { label: 'Net', value: formatMoney(currentStatement.summary.netPoisha, true) },
        { label: 'Transactions', value: String(currentStatement.summary.entryCount) },
      ],
      table: {
        headers: ['Date', 'Person', 'Direction', 'Amount'],
        rows: currentStatement.entries.map((entry) => [
          formatDate(entry.createdAt),
          `${entry.counterparty.displayName} (@${entry.counterparty.handle})`,
          entry.direction === 'credit' ? 'Received' : 'Sent',
          formatMoney(entry.amountPoisha),
        ]),
      },
    });
    await exportPdf(html, '30-day statement');
  }

  return (
    <Page>
      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Card.Header>
            <Card.Description>Money in</Card.Description>
            <Card.Title>{formatMoney(statement.summary.creditTotalPoisha)}</Card.Title>
          </Card.Header>
        </Card>
        <Card className="flex-1">
          <Card.Header>
            <Card.Description>Money out</Card.Description>
            <Card.Title>{formatMoney(statement.summary.debitTotalPoisha)}</Card.Title>
          </Card.Header>
        </Card>
      </View>
      <Card>
        <Card.Content className="pt-6">
          <View className="flex-row items-end justify-between gap-4">
            <View className="gap-1">
              <Text muted size="sm">Net</Text>
              <Text size="2xl" weight="bold">{formatMoney(statement.summary.netPoisha, true)}</Text>
            </View>
            <Text muted>{statement.summary.entryCount} transactions</Text>
          </View>
        </Card.Content>
      </Card>
      <Button fullWidth onPress={download}>Export PDF</Button>
      <View className="gap-2">
        <Text size="lg" weight="semibold">Transactions</Text>
        {statement.entries.length ? (
          <Card className="overflow-hidden">
            {statement.entries.map((entry, index) => (
              <View key={entry.publicId}>
                {index ? <View className="h-px bg-border" /> : null}
                <ActivityRow entry={entry} />
              </View>
            ))}
          </Card>
        ) : (
          <MessageCard title="No transactions in this period" />
        )}
      </View>
    </Page>
  );
}
