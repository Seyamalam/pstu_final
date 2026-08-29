import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  createRequest: {
    kind: "fixed window",
    rate: 10,
    period: MINUTE,
  },
  transferMoney: {
    kind: "fixed window",
    rate: 20,
    period: MINUTE,
  },
  externalRail: {
    kind: "fixed window",
    rate: 12,
    period: MINUTE,
  },
  organizationChange: {
    kind: "fixed window",
    rate: 10,
    period: MINUTE,
  },
  featureCreation: {
    kind: "fixed window",
    rate: 15,
    period: MINUTE,
  },
});

export async function limitRequestCreation(ctx: MutationCtx, userId: string) {
  const result = await rateLimiter.limit(ctx, "createRequest", { key: userId });
  if (!result.ok) {
    fail("RATE_LIMITED", "Too many money requests. Try again in a minute.");
  }
}

export async function limitTransfer(ctx: MutationCtx, userId: string) {
  const result = await rateLimiter.limit(ctx, "transferMoney", { key: userId });
  if (!result.ok) {
    fail("RATE_LIMITED", "Too many transfer attempts. Try again in a minute.");
  }
}

export async function limitExternalRail(ctx: MutationCtx, key: string) {
  const result = await rateLimiter.limit(ctx, "externalRail", { key });
  if (!result.ok) {
    fail("RATE_LIMITED", "Too many rail actions. Try again in a minute.");
  }
}

export async function limitOrganizationChange(
  ctx: MutationCtx,
  userId: string,
) {
  const result = await rateLimiter.limit(ctx, "organizationChange", {
    key: userId,
  });
  if (!result.ok) {
    fail("RATE_LIMITED", "Too many organization changes. Try again soon.");
  }
}

export async function limitFeatureCreation(ctx: MutationCtx, userId: string) {
  const result = await rateLimiter.limit(ctx, "featureCreation", {
    key: userId,
  });
  if (!result.ok) {
    fail("RATE_LIMITED", "Too many changes. Try again in a minute.");
  }
}
