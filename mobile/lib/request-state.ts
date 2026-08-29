export type RequestStatus = 'pending' | 'paid' | 'declined' | 'cancelled';
export type RequestAction = 'accept' | 'decline' | 'cancel' | 'receipt' | 'none';

export type RequestIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function requestActions(input: {
  status: RequestStatus;
  isPayer: boolean;
  isRequester: boolean;
  hasReceipt: boolean;
}): RequestAction[] {
  if (input.status === 'paid' && input.hasReceipt) return ['receipt'];
  if (input.status !== 'pending') return ['none'];
  if (input.isPayer) return ['accept', 'decline'];
  if (input.isRequester) return ['cancel'];
  return ['none'];
}

export function requestIntent(
  current: RequestIntent | null,
  requestId: string,
  createKey: () => string,
): RequestIntent {
  const fingerprint = `accept\u0000${requestId}`;
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, idempotencyKey: createKey() };
}

export function requestStatusLabel(status: RequestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
