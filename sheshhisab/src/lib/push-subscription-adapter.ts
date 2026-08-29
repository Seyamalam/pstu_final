import type { PushSubscriptionPayload } from "./pwa";

export type PushAdapterResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "failed" };

export interface PushSubscriptionAdapter {
  configured: boolean;
  save(subscription: PushSubscriptionPayload): Promise<PushAdapterResult>;
  remove(endpoint: string): Promise<PushAdapterResult>;
}

// Remote subscription storage plugs in here once its authenticated API exists.
export const pushSubscriptionAdapter: PushSubscriptionAdapter = {
  configured: false,
  async save() {
    return { ok: false, reason: "unconfigured" };
  },
  async remove() {
    return { ok: false, reason: "unconfigured" };
  },
};
