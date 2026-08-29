"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Building2,
  Check,
  Crown,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { errorMessage, formatPoisha, initials } from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

const SLUG_PATTERN = /^[a-z0-9_]{3,32}$/;

export function WalletsScreen() {
  const wallets = useQuery(api.wallets.list, {});
  const createOrganization = useMutation(api.wallets.createOrganization);
  const switchContext = useMutation(api.wallets.switchContext);
  const addMember = useMutation(api.wallets.addMember);
  const active = wallets?.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  const members = useQuery(
    api.wallets.listMembers,
    active?.kind === "organization" ? { accountId: active.accountId } : "skip",
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [memberHandle, setMemberHandle] = useState("");
  const [memberRole, setMemberRole] = useState("treasurer");
  const [createState, setCreateState] = useState<ButtonState>("idle");
  const [memberState, setMemberState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!wallets || !active) return <ScreenLoading label="Loading wallets" />;

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanSlug = slug.trim().replace(/^@/, "").toLowerCase();
    if (cleanName.length < 2 || !SLUG_PATTERN.test(cleanSlug)) {
      setMessage("Enter a name and a 3 to 32 character handle.");
      setCreateState("error");
      return;
    }
    setMessage(null);
    setCreateState("loading");
    try {
      const context = await createOrganization({
        name: cleanName,
        slug: cleanSlug,
      });
      await switchContext({ accountId: context.accountId });
      setName("");
      setSlug("");
      setCreateState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not create this organization."));
      setCreateState("error");
    }
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (active.kind !== "organization") return;
    const handle = memberHandle.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      setMessage("Enter a valid member handle.");
      setMemberState("error");
      return;
    }
    setMessage(null);
    setMemberState("loading");
    try {
      await addMember({
        accountId: active.accountId,
        handle,
        role: memberRole,
      });
      setMemberHandle("");
      setMemberState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not add this member."));
      setMemberState("error");
    }
  };

  const canManage =
    active.kind === "organization" &&
    (active.role === "owner" || active.role === "admin");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeading eyebrow="Wallets" title="Personal and organization" />
      {message ? <InlineError>{message}</InlineError> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section>
          <h2 className="text-sm font-semibold">Your wallets</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {wallets.contexts.map((context) => {
              const selected = context.accountId === wallets.activeAccountId;
              const Icon =
                context.kind === "organization" ? Building2 : UserRound;
              return (
                <button
                  key={context.accountId}
                  type="button"
                  onClick={() =>
                    void switchContext({ accountId: context.accountId })
                  }
                  className={cn(
                    "relative flex min-h-32 flex-col items-start rounded-[1.5rem] p-4 text-left outline-none transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-xl",
                      selected ? "bg-white/12" : "bg-muted text-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="mt-4 max-w-full truncate text-sm font-semibold">
                    {context.name}
                  </span>
                  <span
                    className={cn(
                      "mt-1 font-mono text-xs",
                      selected
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {context.slug ? `@${context.slug}` : "Personal"} ·{" "}
                    {context.role}
                  </span>
                  <span className="absolute right-4 top-4 font-mono text-xs font-semibold tabular-nums">
                    {formatPoisha(context.balancePoisha)}
                  </span>
                  {selected ? (
                    <Check
                      aria-label="Active"
                      className="absolute bottom-4 right-4 size-4"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary">
              <Plus aria-hidden="true" className="size-4" />
            </span>
            <h2 className="text-sm font-semibold">New organization</h2>
          </div>
          <form className="mt-4 flex flex-col gap-3" onSubmit={create}>
            <Input
              label="Organization name"
              value={name}
              onChange={setName}
              placeholder="Robotics Club"
              disabled={createState === "loading"}
            />
            <Input
              label="Organization handle"
              value={slug}
              onChange={setSlug}
              placeholder="robotics_club"
              disabled={createState === "loading"}
            />
            <StatefulButton
              type="submit"
              size="lg"
              state={createState}
              loadingText="Creating"
              successText="Created"
              errorText="Check details"
              icon={<WalletCards aria-hidden="true" className="size-4" />}
              className="w-full"
            >
              Create organization
            </StatefulButton>
          </form>
        </section>
      </div>

      {active.kind === "organization" ? (
        <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Members</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active.name} · {active.role}
              </p>
            </div>
            <UsersRound aria-hidden="true" className="size-5 text-primary" />
          </header>
          {canManage ? (
            <form
              onSubmit={add}
              className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end sm:p-5"
            >
              <Input
                label="Member handle"
                value={memberHandle}
                onChange={setMemberHandle}
                placeholder="@handle"
                disabled={memberState === "loading"}
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Role
                <select
                  value={memberRole}
                  onChange={(event) => setMemberRole(event.target.value)}
                  disabled={memberState === "loading"}
                  className="h-12 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {active.role === "owner" ? (
                    <option value="admin">Admin</option>
                  ) : null}
                  <option value="treasurer">Treasurer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <StatefulButton
                type="submit"
                size="lg"
                state={memberState}
                loadingText="Adding"
                successText="Added"
                errorText="Retry"
                className="w-full sm:w-auto"
              >
                Add member
              </StatefulButton>
            </form>
          ) : null}
          {members === undefined ? (
            <div className="h-32 animate-pulse bg-muted/45 motion-reduce:animate-none" />
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.membershipId}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-muted font-mono text-xs font-semibold">
                    {initials(member.user.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {member.user.displayName}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      @{member.user.handle}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">
                    {member.role === "owner" ? (
                      <Crown aria-hidden="true" className="size-3" />
                    ) : (
                      <ShieldCheck aria-hidden="true" className="size-3" />
                    )}
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
