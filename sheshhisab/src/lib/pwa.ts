export type PushPermission = NotificationPermission | "unsupported";

export type PushAvailability =
  | "unsupported"
  | "blocked"
  | "unconfigured"
  | "ready"
  | "subscribed";

export type PushCapabilityInput = {
  secureContext: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  notifications: boolean;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

export function supportsWebPush(input: PushCapabilityInput): boolean {
  return (
    input.secureContext &&
    input.serviceWorker &&
    input.pushManager &&
    input.notifications
  );
}

export function resolvePushAvailability({
  supported,
  permission,
  configured,
  subscribed,
}: {
  supported: boolean;
  permission: PushPermission;
  configured: boolean;
  subscribed: boolean;
}): PushAvailability {
  if (!supported || permission === "unsupported") return "unsupported";
  if (permission === "denied") return "blocked";
  if (subscribed) return "subscribed";
  if (!configured) return "unconfigured";
  return "ready";
}

export function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error("Invalid VAPID public key");
  }

  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const base64 = `${normalized}${padding}`
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

export function toPushSubscriptionPayload(
  value: unknown,
): PushSubscriptionPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid push subscription");
  }

  const candidate = value as Record<string, unknown>;
  const keys = candidate.keys;
  if (!keys || typeof keys !== "object") {
    throw new Error("Invalid push subscription keys");
  }

  const keyRecord = keys as Record<string, unknown>;
  const endpoint = candidate.endpoint;
  const auth = keyRecord.auth;
  const p256dh = keyRecord.p256dh;
  const expirationTime = candidate.expirationTime;
  let endpointUrl: URL | null = null;
  try {
    endpointUrl = typeof endpoint === "string" ? new URL(endpoint) : null;
  } catch {
    endpointUrl = null;
  }

  if (
    typeof endpoint !== "string" ||
    endpointUrl?.protocol !== "https:" ||
    typeof auth !== "string" ||
    auth.length === 0 ||
    typeof p256dh !== "string" ||
    p256dh.length === 0 ||
    !(
      expirationTime === null ||
      (typeof expirationTime === "number" && Number.isFinite(expirationTime))
    )
  ) {
    throw new Error("Invalid push subscription");
  }

  return { endpoint, expirationTime, keys: { auth, p256dh } };
}
