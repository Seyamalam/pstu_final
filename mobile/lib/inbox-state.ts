export type InboxKind = 'rail' | 'member' | 'transfer' | 'request';

const SAFE_REFERENCE_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export function isSafeReference(value: string): boolean {
  return SAFE_REFERENCE_PATTERN.test(value);
}

export function inboxCopy(eventKey: string): { title: string; detail: string } {
  switch (eventKey) {
    case 'transfer.received':
      return { title: 'Money received', detail: 'Open the receipt for details.' };
    case 'request.created':
      return { title: 'Payment request', detail: 'Review and respond.' };
    case 'request.declined':
      return { title: 'Request declined', detail: 'The request was not paid.' };
    case 'request.cancelled':
      return { title: 'Request cancelled', detail: 'No payment was made.' };
    case 'split.invited':
      return { title: 'Split bill', detail: 'Review your share.' };
    case 'org.member':
      return { title: 'Organization access', detail: 'Your wallet access changed.' };
    case 'cash_in':
      return { title: 'Money added', detail: 'Your wallet balance was updated.' };
    case 'cash_out':
      return { title: 'Money withdrawn', detail: 'Your wallet balance was updated.' };
    default:
      return { title: 'Wallet update', detail: 'Open for details.' };
  }
}

export function inboxRoute(input: {
  kind: InboxKind;
  referenceId: string;
  eventKey?: string;
}): string {
  if (!isSafeReference(input.referenceId)) return '/(tabs)/inbox';
  if (input.eventKey === 'split.invited') {
    return `/split/${encodeURIComponent(input.referenceId)}`;
  }
  if (input.kind === 'transfer') {
    return `/receipt/${encodeURIComponent(input.referenceId)}`;
  }
  if (input.kind === 'request') {
    return `/request/${encodeURIComponent(input.referenceId)}`;
  }
  if (input.kind === 'rail') return '/(tabs)/activity';
  return '/(tabs)/home';
}
