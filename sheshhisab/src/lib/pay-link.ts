const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const MAX_PAY_LINK_LENGTH = 512;

export function parsePayLink(
  raw: string,
  allowedOrigin: string,
): string | null {
  if (raw.length < 1 || raw.length > MAX_PAY_LINK_LENGTH) return null;

  try {
    const url = new URL(raw);
    const isWeb = url.protocol === "https:" && url.origin === allowedOrigin;
    const isApp = url.protocol === "sheshhisab:" && url.hostname === "pay";
    if (!isWeb && !isApp) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const queryKeys = [...url.searchParams.keys()];
    const handle = isWeb
      ? url.searchParams.get("v") === "1" &&
        queryKeys.length === 1 &&
        queryKeys[0] === "v" &&
        segments.length === 2 &&
        segments[0] === "pay"
        ? segments[1]
        : null
      : url.search.length === 0 && segments.length === 2 && segments[0] === "v1"
        ? segments[1]
        : null;
    return handle && HANDLE_PATTERN.test(handle) ? handle : null;
  } catch {
    return null;
  }
}

export function createPayLink(origin: string, handle: string) {
  if (!HANDLE_PATTERN.test(handle)) throw new Error("Invalid handle");
  return `${origin}/pay/${encodeURIComponent(handle)}?v=1`;
}
