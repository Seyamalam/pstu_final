import { notFound, redirect } from "next/navigation";
import { parsePayIntentParams, poishaToInput } from "@/lib/pay-link";

export const instant = false;

export default async function PayLinkPage({
  params,
  searchParams,
}: PageProps<"/pay/[handle]">) {
  const { handle } = await params;
  const rawParams = await searchParams;
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") entries.push([key, value]);
    else if (Array.isArray(value)) {
      entries.push(...value.map((item) => [key, item] as [string, string]));
    }
  }
  const intent = parsePayIntentParams(handle, new URLSearchParams(entries));
  if (!intent) notFound();

  const next = new URLSearchParams({ to: intent.handle });
  if (intent.amountPoisha !== null) {
    next.set("amount", poishaToInput(intent.amountPoisha));
  }
  if (intent.note !== null) next.set("note", intent.note);
  redirect(`/app/send?${next.toString()}`);
}
