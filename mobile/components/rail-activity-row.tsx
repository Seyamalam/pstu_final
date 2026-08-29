import type { FunctionReturnType } from 'convex/server';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';

type RailTransactions = FunctionReturnType<typeof api.rails.list>;
type RailTransaction = RailTransactions[number];

export function RailActivityRow({ transaction }: { transaction: RailTransaction }) {
  const credit = transaction.direction === 'cash_in';
  return (
    <Item size="sm">
      <Item.Content>
        <Item.Title>{transaction.provider.name}</Item.Title>
        <Item.Description>
          {transaction.referenceMasked} · {formatDate(transaction.createdAt)}
        </Item.Description>
      </Item.Content>
      <Item.Actions className="items-end gap-0.5">
        <Text weight="semibold" className={credit ? 'text-success' : 'text-foreground'}>
          {credit ? '+' : '−'}{formatMoney(transaction.amountPoisha)}
        </Text>
        <Text muted size="xs">{credit ? 'Added' : 'Withdrawn'}</Text>
      </Item.Actions>
    </Item>
  );
}
