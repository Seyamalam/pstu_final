import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    PUSH_VAPID_SUBJECT: v.optional(v.string()),
    PUSH_VAPID_PUBLIC_KEY: v.optional(v.string()),
    PUSH_VAPID_PRIVATE_KEY: v.optional(v.string()),
    EXPO_ACCESS_TOKEN: v.optional(v.string()),
    RAIL_REFERENCE_PEPPER: v.optional(v.string()),
    RESEND_API_KEY: v.optional(v.string()),
    AUTH_EMAIL_FROM: v.optional(v.string()),
  },
});

app.use(betterAuth);
app.use(rateLimiter);

export default app;
