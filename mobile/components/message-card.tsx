import { Card } from 'panelui-native/components/card';
import { Text } from 'panelui-native/primitives/text';

export function MessageCard({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {detail ? <Card.Description>{detail}</Card.Description> : null}
      </Card.Header>
    </Card>
  );
}

