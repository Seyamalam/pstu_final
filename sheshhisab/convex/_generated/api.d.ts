/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as dashboard from "../dashboard.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_budgets from "../lib/budgets.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_qr from "../lib/qr.js";
import type * as lib_rails from "../lib/rails.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_requestState from "../lib/requestState.js";
import type * as lib_requests from "../lib/requests.js";
import type * as lib_transfers from "../lib/transfers.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_wallets from "../lib/wallets.js";
import type * as notifications from "../notifications.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as qr from "../qr.js";
import type * as rails from "../rails.js";
import type * as receipts from "../receipts.js";
import type * as requests from "../requests.js";
import type * as scheduledTransfers from "../scheduledTransfers.js";
import type * as statements from "../statements.js";
import type * as transfers from "../transfers.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";
import type * as wallets from "../wallets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  auth: typeof auth;
  budgets: typeof budgets;
  dashboard: typeof dashboard;
  favorites: typeof favorites;
  http: typeof http;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/budgets": typeof lib_budgets;
  "lib/errors": typeof lib_errors;
  "lib/money": typeof lib_money;
  "lib/notifications": typeof lib_notifications;
  "lib/qr": typeof lib_qr;
  "lib/rails": typeof lib_rails;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/requestState": typeof lib_requestState;
  "lib/requests": typeof lib_requests;
  "lib/transfers": typeof lib_transfers;
  "lib/validators": typeof lib_validators;
  "lib/wallets": typeof lib_wallets;
  notifications: typeof notifications;
  pushDelivery: typeof pushDelivery;
  qr: typeof qr;
  rails: typeof rails;
  receipts: typeof receipts;
  requests: typeof requests;
  scheduledTransfers: typeof scheduledTransfers;
  statements: typeof statements;
  transfers: typeof transfers;
  users: typeof users;
  viewer: typeof viewer;
  wallets: typeof wallets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
