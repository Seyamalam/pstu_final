export type NotificationKind = "rail" | "member" | "transfer" | "request";

const SAFE_REFERENCE_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export function pushCopy(kind: NotificationKind, eventKey: string) {
  switch (eventKey) {
    case "transfer.received":
      return {
        title: "Payment received",
        body: "Money arrived in your wallet.",
      };
    case "request.created":
      return {
        title: "Payment request",
        body: "A new request is ready to review.",
      };
    case "request.declined":
      return { title: "Request declined", body: "The request was not paid." };
    case "request.cancelled":
      return { title: "Request cancelled", body: "No payment was made." };
    case "split.invited":
      return { title: "Split bill", body: "Your share is ready to review." };
    case "cash_in":
      return { title: "Money added", body: "Your wallet balance was updated." };
    case "cash_out":
      return {
        title: "Money withdrawn",
        body: "Your wallet balance was updated.",
      };
    case "org.member":
      return {
        title: "Organization access",
        body: "Your wallet access changed.",
      };
    default:
      return {
        title: "SheshHisab",
        body:
          kind === "request"
            ? "A money request was updated."
            : "Your wallet was updated.",
      };
  }
}

export function webPushUrl(
  kind: NotificationKind,
  eventKey: string,
  referenceId: string,
) {
  const safeReference = SAFE_REFERENCE_PATTERN.test(referenceId)
    ? encodeURIComponent(referenceId)
    : null;
  if (eventKey === "split.invited" && safeReference) {
    return `/app/splits/${safeReference}`;
  }
  if (kind === "transfer" && safeReference) {
    return `/app/receipt/${safeReference}`;
  }
  if (kind === "rail") return "/app/money";
  if (kind === "member") return "/app/wallets";
  if (kind === "request") return "/app/notifications";
  return "/app/activity";
}

export function pushTag(kind: NotificationKind, referenceId: string) {
  const suffix = SAFE_REFERENCE_PATTERN.test(referenceId)
    ? referenceId
    : "update";
  return `sheshhisab-${kind}-${suffix}`.slice(0, 80);
}
