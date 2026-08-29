export function formatMoney(amountPoisha: bigint, signed = false) {
  const amount = Number(amountPoisha) / 100;
  const prefix = signed && amount > 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

export function parseTakaToPoisha(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [taka, fraction = ''] = normalized.split('.');
  const poisha = fraction.padEnd(2, '0');
  const amount = BigInt(taka) * 100n + BigInt(poisha || '0');
  return amount > 0n ? amount : null;
}

export function poishaToTakaInput(amountPoisha: bigint): string {
  const taka = amountPoisha / 100n;
  const poisha = amountPoisha % 100n;
  return poisha === 0n
    ? taka.toString()
    : `${taka}.${poisha.toString().padStart(2, '0').replace(/0$/, '')}`;
}
