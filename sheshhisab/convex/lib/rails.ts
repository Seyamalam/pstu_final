import type { Doc } from "../_generated/dataModel";
import { fail } from "./errors";
import { assertAmount, normalizeIdempotencyKey } from "./money";

export const RAIL_PROVIDERS = [
  { id: "bkash", kind: "mfs", name: "bKash" },
  { id: "nagad", kind: "mfs", name: "Nagad" },
  { id: "rocket", kind: "mfs", name: "Rocket" },
  { id: "upay", kind: "mfs", name: "Upay" },
  { id: "brac_bank", kind: "bank", name: "BRAC Bank" },
  { id: "city_bank", kind: "bank", name: "City Bank" },
  { id: "dutch_bangla_bank", kind: "bank", name: "Dutch-Bangla Bank" },
  { id: "eastern_bank", kind: "bank", name: "Eastern Bank" },
  {
    id: "islami_bank_bangladesh",
    kind: "bank",
    name: "Islami Bank Bangladesh",
  },
  { id: "visa", kind: "card", name: "Visa" },
  { id: "mastercard", kind: "card", name: "Mastercard" },
] as const;

export type RailProvider = (typeof RAIL_PROVIDERS)[number];
export type RailDirection = "cash_in" | "cash_out";

export const MAX_RAIL_AMOUNT_POISHA = 50_000_000n;
export const DAILY_RAIL_LIMIT_POISHA = 100_000_000n;
export const MAX_WALLET_BALANCE_POISHA = 10_000_000_000n;

export function getRailProvider(value: string): RailProvider {
  const provider = RAIL_PROVIDERS.find((item) => item.id === value);
  if (!provider) {
    fail("INVALID_PROVIDER", "Choose a supported provider.");
  }
  return provider;
}

export function assertRailAmount(amountPoisha: bigint): void {
  assertAmount(amountPoisha);
  if (amountPoisha > MAX_RAIL_AMOUNT_POISHA) {
    fail("RAIL_LIMIT", "Amount is above the rail limit.");
  }
}

export function normalizeRailReference(
  provider: RailProvider,
  value: string,
): { normalized: string; masked: string } {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (provider.kind === "mfs") {
    const normalized = compact.startsWith("+880")
      ? compact
      : compact.startsWith("880")
        ? `+${compact}`
        : compact.startsWith("01")
          ? `+88${compact}`
          : compact;
    if (!/^\+8801[3-9]\d{8}$/.test(normalized)) {
      fail("INVALID_REFERENCE", "Enter a valid Bangladesh mobile number.");
    }
    return {
      normalized,
      masked: `${normalized.slice(0, 6)}••••${normalized.slice(-3)}`,
    };
  }

  if (provider.kind === "card") {
    if (!/^\d{4}$/.test(compact)) {
      fail("INVALID_REFERENCE", "Enter the card's last 4 digits.");
    }
    return { normalized: compact, masked: `•••• ${compact}` };
  }

  const normalized = compact.toUpperCase();
  if (!/^[A-Z0-9]{6,24}$/.test(normalized)) {
    fail("INVALID_REFERENCE", "Enter a valid bank account number.");
  }
  return { normalized, masked: `••••${normalized.slice(-4)}` };
}

export function normalizeRailIntent(input: {
  provider: string;
  amountPoisha: bigint;
  reference: string;
  idempotencyKey: string;
}) {
  const provider = getRailProvider(input.provider);
  assertRailAmount(input.amountPoisha);
  const reference = normalizeRailReference(provider, input.reference);
  return {
    provider,
    amountPoisha: input.amountPoisha,
    reference,
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
  };
}

export function assertIdempotentRailIntent(
  existing: Doc<"externalRailTransactions">,
  input: {
    accountId: Doc<"externalRailTransactions">["accountId"];
    direction: RailDirection;
    provider: RailProvider;
    amountPoisha: bigint;
    referenceFingerprint: string;
  },
): void {
  const sameIntent =
    existing.accountId === input.accountId &&
    existing.direction === input.direction &&
    existing.provider === input.provider.id &&
    existing.amountPoisha === input.amountPoisha &&
    existing.referenceFingerprint === input.referenceFingerprint;
  if (!sameIntent) {
    fail(
      "IDEMPOTENCY_CONFLICT",
      "Payment key already belongs to another action.",
    );
  }
}
