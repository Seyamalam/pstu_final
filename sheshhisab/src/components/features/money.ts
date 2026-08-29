const BDT_INPUT_PATTERN = /^\d+(?:\.\d{0,2})?$/;
const HANDLE_PATTERN = /^[a-z0-9_]{1,24}$/;
const BDT_FORMATTER = new Intl.NumberFormat("en-BD");
const DATE_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "Asia/Dhaka",
});

export function parseBdtInput(value: string): bigint | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!BDT_INPUT_PATTERN.test(normalized)) return null;

  const [whole = "0", fraction = ""] = normalized.split(".");
  try {
    return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  } catch {
    return null;
  }
}

export function formatPoisha(
  value: bigint,
  sign: "none" | "plus" | "minus" = "none",
) {
  const absolute = value < BigInt(0) ? -value : value;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  const prefix = sign === "plus" ? "+" : sign === "minus" ? "−" : "";
  return `${prefix}৳${BDT_FORMATTER.format(whole)}.${fraction}`;
}

export function formatTimestamp(value: number) {
  return DATE_FORMATTER.format(new Date(value));
}

export function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function normalizeHandleInput(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function canSearchHandle(value: string) {
  return HANDLE_PATTERN.test(normalizeHandleInput(value));
}

export function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return fallback;
}
