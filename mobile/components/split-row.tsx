import type { FunctionReturnType } from 'convex/server';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { api } from '@/lib/convex-api';
import { formatMoney } from '@/lib/format';
import { remainingShare } from '@/lib/split-state';

type SplitBills = FunctionReturnType<typeof api.splitBills.list>;
export type SplitBill = SplitBills[number];

export function SplitRow({ bill, onPress }: { bill: SplitBill; onPress: () => void }) {
  const remaining = remainingShare(bill.totalPoisha, bill.contributedTotalPoisha);
  return (
    <Item size="sm" onPress={onPress}>
      <Item.Content>
        <Item.Title>{bill.title}</Item.Title>
        <Item.Description>
          {bill.participants.length} {bill.participants.length === 1 ? 'person' : 'people'} · {bill.status}
        </Item.Description>
      </Item.Content>
      <Item.Actions className="items-end gap-0.5">
        <Text weight="semibold">{formatMoney(bill.totalPoisha)}</Text>
        <Text muted size="xs">
          {remaining > 0n ? `${formatMoney(remaining)} left` : 'Complete'}
        </Text>
      </Item.Actions>
    </Item>
  );
}
