const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const MAX_PAY_LINK_LENGTH = 2_048;
const MAX_AMOUNT_POISHA = 10_000_000_000n;
const MAX_NOTE_LENGTH = 120;

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function isSecureOrLoopback(url: URL): boolean {
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]"))
  );
}

export type PayIntent = {
  handle: string;
  amountPoisha: bigint | null;
  note: string | null;
};

function parseAmount(value: string | null): bigint | null | undefined {
  if (value === null) return null;
  if (!/^[1-9]\d{0,10}$/.test(value)) return undefined;
  const amountPoisha = BigInt(value);
  return amountPoisha <= MAX_AMOUNT_POISHA ? amountPoisha : undefined;
}

function parseNote(value: string | null): string | null | undefined {
  if (value === null) return null;
  if (
    value.length < 1 ||
    value.length > MAX_NOTE_LENGTH ||
    value !== value.trim() ||
    hasControlCharacters(value)
  ) {
    return undefined;
  }
  return value;
}

export function isValidPayNote(value: string): boolean {
  return parseNote(value) !== undefined;
}

export function parsePayIntentParams(
  handle: string,
  params: URLSearchParams,
): PayIntent | null {
  if (!HANDLE_PATTERN.test(handle)) return null;
  const keys = [...params.keys()];
  if (
    params.get("v") !== "1" ||
    keys.some((key) => key !== "v" && key !== "a" && key !== "n") ||
    new Set(keys).size !== keys.length
  ) {
    return null;
  }

  const amountPoisha = parseAmount(params.get("a"));
  const note = parseNote(params.get("n"));
  if (amountPoisha === undefined || note === undefined) return null;
  return { handle, amountPoisha, note };
}

export function parsePayIntent(
  raw: string,
  allowedOrigin: string,
): PayIntent | null {
  if (raw.length < 1 || raw.length > MAX_PAY_LINK_LENGTH) return null;

  try {
    const url = new URL(raw);
    const allowed = new URL(allowedOrigin);
    const isWeb =
      isSecureOrLoopback(url) &&
      isSecureOrLoopback(allowed) &&
      url.origin === allowed.origin;
    const isApp = url.protocol === "sheshhisab:" && url.hostname === "pay";
    if (!isWeb && !isApp) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (isWeb) {
      return segments.length === 2 && segments[0] === "pay"
        ? parsePayIntentParams(segments[1] ?? "", url.searchParams)
        : null;
    }
    const handle =
      url.search.length === 0 && segments.length === 2 && segments[0] === "v1"
        ? segments[1]
        : null;
    return handle && HANDLE_PATTERN.test(handle)
      ? { handle, amountPoisha: null, note: null }
      : null;
  } catch {
    return null;
  }
}

export function parsePayLink(
  raw: string,
  allowedOrigin: string,
): string | null {
  return parsePayIntent(raw, allowedOrigin)?.handle ?? null;
}

export function createPayLink(
  origin: string,
  handle: string,
  options: { amountPoisha?: bigint | null; note?: string | null } = {},
) {
  if (!HANDLE_PATTERN.test(handle)) throw new Error("Invalid handle");
  const url = new URL(`/pay/${encodeURIComponent(handle)}`, origin);
  if (!isSecureOrLoopback(url)) {
    throw new Error("Invalid origin");
  }
  url.searchParams.set("v", "1");
  if (options.amountPoisha !== undefined && options.amountPoisha !== null) {
    if (
      options.amountPoisha <= 0n ||
      options.amountPoisha > MAX_AMOUNT_POISHA
    ) {
      throw new Error("Invalid amount");
    }
    url.searchParams.set("a", options.amountPoisha.toString());
  }
  if (options.note !== undefined && options.note !== null) {
    const note = parseNote(options.note);
    if (!note) throw new Error("Invalid note");
    url.searchParams.set("n", note);
  }
  return url.toString();
}

export function poishaToInput(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}
