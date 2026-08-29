import type { FunctionReturnType } from 'convex/server';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';

type ActivityPage = FunctionReturnType<typeof api.activity.list>;
export type ActivityEntry = ActivityPage['page'][number];

export function ActivityRow({
  entry,
  onPress,
}: {
  entry: ActivityEntry;
  onPress?: () => void;
}) {
  const credit = entry.direction === 'credit';
  return (
    <Item size="sm" onPress={onPress}>
      <Item.Content>
        <Item.Title>{entry.counterparty.displayName}</Item.Title>
        <Item.Description>
          {entry.note || formatDate(entry.createdAt)}
        </Item.Description>
      </Item.Content>
      <Item.Actions className="items-end gap-0.5">
        <Text weight="semibold" className={credit ? 'text-success' : 'text-foreground'}>
          {credit ? '+' : '−'}{formatMoney(entry.amountPoisha)}
        </Text>
        <Text muted size="xs">
          {formatDate(entry.createdAt)}
        </Text>
      </Item.Actions>
    </Item>
  );
}

