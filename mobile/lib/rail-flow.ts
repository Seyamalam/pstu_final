export type RailDirection = 'cash_in' | 'cash_out';
export type RailProviderKind = 'mfs' | 'bank' | 'card';

export type RailProvider = {
  id: string;
  kind: RailProviderKind;
  name: string;
};

export type RailIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export const RAIL_PROVIDERS = [
  { id: 'bkash', kind: 'mfs', name: 'bKash' },
  { id: 'nagad', kind: 'mfs', name: 'Nagad' },
  { id: 'rocket', kind: 'mfs', name: 'Rocket' },
  { id: 'upay', kind: 'mfs', name: 'Upay' },
  { id: 'brac_bank', kind: 'bank', name: 'BRAC Bank' },
  { id: 'city_bank', kind: 'bank', name: 'City Bank' },
  { id: 'dutch_bangla_bank', kind: 'bank', name: 'Dutch-Bangla Bank' },
  { id: 'eastern_bank', kind: 'bank', name: 'Eastern Bank' },
  { id: 'islami_bank_bangladesh', kind: 'bank', name: 'Islami Bank Bangladesh' },
  { id: 'visa', kind: 'card', name: 'Visa' },
  { id: 'mastercard', kind: 'card', name: 'Mastercard' },
] as const satisfies readonly RailProvider[];

export function providerById(value: string): RailProvider | null {
  return RAIL_PROVIDERS.find((provider) => provider.id === value) ?? null;
}

export function providersByKind(kind: RailProviderKind): readonly RailProvider[] {
  return RAIL_PROVIDERS.filter((provider) => provider.kind === kind);
}

export function normalizeRailReference(
  provider: RailProvider,
  value: string,
): { normalized: string; masked: string } | null {
  const compact = value.trim().replace(/[\s-]/g, '');
  if (provider.kind === 'mfs') {
    const normalized = compact.startsWith('+880')
      ? compact
      : compact.startsWith('880')
        ? `+${compact}`
        : compact.startsWith('01')
          ? `+88${compact}`
          : compact;
    return /^\+8801[3-9]\d{8}$/.test(normalized)
      ? { normalized, masked: `${normalized.slice(0, 6)}••••${normalized.slice(-3)}` }
      : null;
  }

  if (provider.kind === 'card') {
    return /^\d{4}$/.test(compact)
      ? { normalized: compact, masked: `•••• ${compact}` }
      : null;
  }

  const normalized = compact.toUpperCase();
  return /^[A-Z0-9]{6,24}$/.test(normalized)
    ? { normalized, masked: `••••${normalized.slice(-4)}` }
    : null;
}

export function referenceLabel(kind: RailProviderKind): string {
  if (kind === 'mfs') return 'Mobile number';
  if (kind === 'card') return 'Card last 4 digits';
  return 'Account number';
}

export function railFingerprint(input: {
  accountId: string;
  direction: RailDirection;
  providerId: string;
  amountPoisha: bigint;
  reference: string;
}): string {
  return [
    input.accountId,
    input.direction,
    input.providerId,
    input.amountPoisha.toString(),
    input.reference,
  ].join('\u0000');
}

export function railIntent(
  current: RailIntent | null,
  fingerprint: string,
  createKey: () => string,
): RailIntent {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, idempotencyKey: createKey() };
}

export function railRoute(direction: RailDirection): '/add-money' | '/withdraw' {
  return direction === 'cash_in' ? '/add-money' : '/withdraw';
}
