import type { FunctionReturnType } from 'convex/server';
import { Item } from 'panelui-native/components/item';
import { Text } from 'panelui-native/primitives/text';

import { api } from '@/lib/convex-api';
import { formatDate, formatMoney } from '@/lib/format';
import { requestStatusLabel } from '@/lib/request-state';

type Requests = FunctionReturnType<typeof api.requests.list>;
export type RequestItem = Requests[number];

export function RequestRow({
  request,
  perspective,
  onPress,
}: {
  request: RequestItem;
  perspective: 'payer' | 'requester';
  onPress: () => void;
}) {
  const person = perspective === 'payer' ? request.requester : request.payer;
  return (
    <Item size="sm" onPress={onPress}>
      <Item.Content>
        <Item.Title>{person.displayName}</Item.Title>
        <Item.Description>
          {request.note || formatDate(request.createdAt)}
        </Item.Description>
      </Item.Content>
      <Item.Actions className="items-end gap-0.5">
        <Text weight="semibold">{formatMoney(request.amountPoisha)}</Text>
        <Text muted size="xs">{requestStatusLabel(request.status)}</Text>
      </Item.Actions>
    </Item>
  );
}
