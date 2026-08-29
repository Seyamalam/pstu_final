const RECEIPT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const REFERENCE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

type NotificationData = Record<string, unknown> | null | undefined;

export function notificationRoute(data: NotificationData): string {
  if (!data) return '/(tabs)/home';

  const receiptId = data.receiptId;
  if (typeof receiptId === 'string' && RECEIPT_ID_PATTERN.test(receiptId)) {
    return `/receipt/${encodeURIComponent(receiptId)}`;
  }

  switch (data.kind) {
    case 'money_request':
    case 'request': {
      const referenceId = data.referenceId;
      if (
        data.eventKey === 'split.invited'
        && typeof referenceId === 'string'
        && REFERENCE_ID_PATTERN.test(referenceId)
      ) {
        return `/split/${encodeURIComponent(referenceId)}`;
      }
      return typeof referenceId === 'string' && REFERENCE_ID_PATTERN.test(referenceId)
        ? `/request/${encodeURIComponent(referenceId)}`
        : '/(tabs)/inbox';
    }
    case 'transfer':
    case 'rail_transfer':
    case 'rail':
      return '/(tabs)/activity';
    case 'member':
      return '/(tabs)/home';
    default:
      return '/(tabs)/inbox';
  }
}
