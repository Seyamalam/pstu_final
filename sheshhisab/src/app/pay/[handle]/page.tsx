import { notFound, redirect } from "next/navigation";

const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export const instant = false;

export default async function PayLinkPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  redirect(`/app/send?to=${encodeURIComponent(handle)}`);
}
