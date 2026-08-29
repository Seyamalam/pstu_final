const CUSTOM_PAYEE_PATTERN = /^sheshhisab:\/\/pay\/v1\/([a-z0-9_]{3,24})$/;
const HTTPS_PAYEE_PATH_PATTERN = /^\/pay\/([a-z0-9_]{3,24})$/;

export type PayeeCode = {
  version: 1;
  handle: string;
  canonicalPayload: string;
};

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
