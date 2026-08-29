import { fail } from "./errors";

export type RequestStatus = "pending" | "paid" | "declined" | "cancelled";

export function assertRequestTransition(
  current: RequestStatus,
  next: Exclude<RequestStatus, "pending">,
): void {
  if (current !== "pending") {
    fail(
      "REQUEST_RESOLVED",
      `A ${current} request cannot be changed to ${next}.`,
    );
  }
}
