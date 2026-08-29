import { ConvexError } from "convex/values";

export function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}
