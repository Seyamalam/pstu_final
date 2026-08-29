const MAX_NEXT_PATH_LENGTH = 512;

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || raw.length > MAX_NEXT_PATH_LENGTH || !raw.startsWith("/")) {
    return "/app";
  }

  try {
    const url = new URL(raw, "https://sheshhisab.invalid");
    if (url.origin !== "https://sheshhisab.invalid") return "/app";
    if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) {
      return "/app";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/app";
  }
}
