const CUSTOM_PAYEE_PATTERN = /^sheshhisab:\/\/pay\/v1\/([a-z0-9_]{3,24})$/;
const HTTPS_PAYEE_PATH_PATTERN = /^\/pay\/([a-z0-9_]{3,24})$/;
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const HTTPS_REQUEST_PATH_PATTERN = /^\/request\/([a-z0-9_]{3,24})$/;

export type PayeeCode = {
  version: 1;
  handle: string;
  canonicalPayload: string;
};

export type RequestCode = {
  version: 1;
  kind: 'request';
  handle: string;
  amountPoisha: bigint;
  note: string | null;
  canonicalPayload: string;
  payeePayload: string;
};

export type PaymentCode =
  | (PayeeCode & { kind: 'payee'; amountPoisha: null; note: null; payeePayload: string })
  | RequestCode;

function result(handle: string): PayeeCode {
  return {
    version: 1,
    handle,
    canonicalPayload: `sheshhisab://pay/v1/${handle}`,
  };
}

export function parsePayeeCode(
  raw: string,
  allowedHttpsOrigins: readonly string[],
): PayeeCode | null {
  if (raw.length > 256 || raw.trim() !== raw) {
    return null;
  }

  const customMatch = CUSTOM_PAYEE_PATTERN.exec(raw);
  if (customMatch) {
    return result(customMatch[1]);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !allowedHttpsOrigins.includes(url.origin)
  ) {
    return null;
  }
  const queryKeys = [...url.searchParams.keys()];
  if (
    queryKeys.length !== 1 ||
    queryKeys[0] !== 'v' ||
    url.searchParams.get('v') !== '1'
  ) {
    return null;
  }
  const pathMatch = HTTPS_PAYEE_PATH_PATTERN.exec(url.pathname);
  return pathMatch ? result(pathMatch[1]) : null;
}

function parseRequestUrl(url: URL, allowedHttpsOrigins: readonly string[]): RequestCode | null {
  const custom = url.protocol === 'sheshhisab:' && url.hostname === 'request';
  const secureWeb = url.protocol === 'https:' && allowedHttpsOrigins.includes(url.origin);
  if (!custom && !secureWeb) return null;
  if (url.username || url.password || url.hash) return null;

  const pathMatch = custom
    ? /^\/v1\/([a-z0-9_]{3,24})$/.exec(url.pathname)
    : HTTPS_REQUEST_PATH_PATTERN.exec(url.pathname);
  if (!pathMatch) return null;

  const keys = [...url.searchParams.keys()];
  const expected = secureWeb ? ['v', 'amount', 'note'] : ['amount', 'note'];
  if (
    keys.some((key) => !expected.includes(key))
    || new Set(keys).size !== keys.length
    || (secureWeb && url.searchParams.get('v') !== '1')
  ) return null;

  const amount = url.searchParams.get('amount');
  if (!amount || !/^[1-9]\d{0,11}$/.test(amount)) return null;
  const amountPoisha = BigInt(amount);
  if (amountPoisha > 10_000_000_000n) return null;
  const noteValue = url.searchParams.get('note');
  const note = noteValue?.trim() || null;
  if ((noteValue !== null && noteValue !== noteValue.trim()) || (note?.length ?? 0) > 120) {
    return null;
  }
  const canonicalPayload = buildRequestCode({
    handle: pathMatch[1],
    amountPoisha,
    note,
  });
  return {
    version: 1,
    kind: 'request',
    handle: pathMatch[1],
    amountPoisha,
    note,
    canonicalPayload,
    payeePayload: result(pathMatch[1]).canonicalPayload,
  };
}

export function buildRequestCode(input: {
  handle: string;
  amountPoisha: bigint;
  note?: string | null;
}): string {
  const handle = input.handle.trim().replace(/^@/, '').toLowerCase();
  const note = input.note?.trim() || null;
  if (
    !HANDLE_PATTERN.test(handle)
    || input.amountPoisha <= 0n
    || input.amountPoisha > 10_000_000_000n
    || (note?.length ?? 0) > 120
  ) {
    throw new Error('Invalid request code.');
  }
  const query = new URLSearchParams({ amount: input.amountPoisha.toString() });
  if (note) query.set('note', note);
  return `sheshhisab://request/v1/${handle}?${query.toString()}`;
}

export function tryBuildRequestCode(input: {
  handle: string;
  amountPoisha: bigint;
  note?: string | null;
}): string | null {
  try {
    return buildRequestCode(input);
  } catch {
    return null;
  }
}

export function parsePaymentCode(
  raw: string,
  allowedHttpsOrigins: readonly string[],
): PaymentCode | null {
  const payee = parsePayeeCode(raw, allowedHttpsOrigins);
  if (payee) {
    return {
      ...payee,
      kind: 'payee',
      amountPoisha: null,
      note: null,
      payeePayload: payee.canonicalPayload,
    };
  }
  if (raw.length > 512 || raw.trim() !== raw) return null;
  try {
    return parseRequestUrl(new URL(raw), allowedHttpsOrigins);
  } catch {
    return null;
  }
}
