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
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_requestState from "../lib/requestState.js";
import type * as lib_requests from "../lib/requests.js";
import type * as lib_transfers from "../lib/transfers.js";
import type * as lib_validators from "../lib/validators.js";
import type * as receipts from "../receipts.js";
import type * as requests from "../requests.js";
import type * as transfers from "../transfers.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  auth: typeof auth;
  dashboard: typeof dashboard;
  http: typeof http;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/money": typeof lib_money;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/requestState": typeof lib_requestState;
  "lib/requests": typeof lib_requests;
  "lib/transfers": typeof lib_transfers;
  "lib/validators": typeof lib_validators;
  receipts: typeof receipts;
  requests: typeof requests;
  transfers: typeof transfers;
  users: typeof users;
  viewer: typeof viewer;
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
