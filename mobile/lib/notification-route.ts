const RECEIPT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

type NotificationData = Record<string, unknown> | null | undefined;

export function notificationRoute(data: NotificationData): string {
  if (!data) return '/(tabs)/home';

  const receiptId = data.receiptId;
  if (typeof receiptId === 'string' && RECEIPT_ID_PATTERN.test(receiptId)) {
    return `/receipt/${encodeURIComponent(receiptId)}`;
  }

  switch (data.kind) {
    case 'money_request':
      return '/(tabs)/home';
    case 'transfer':
    case 'rail_transfer':
      return '/(tabs)/activity';
    default:
      return '/(tabs)/home';
  }
}
