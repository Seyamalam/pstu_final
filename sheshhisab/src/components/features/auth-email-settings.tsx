"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/motion/button/base";
import { authClient } from "@/lib/auth-client";

export function AuthEmailSettings() {
  const { data: session } = authClient.useSession();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  if (!session?.user?.email || session.user.emailVerified) return null;

  async function send() {
    if (!session?.user?.email || state === "sending") return;
    setState("sending");
    const result = await authClient.sendVerificationEmail({
      email: session.user.email,
      callbackURL: "/app/more",
    });
    setState(result.error ? "error" : "sent");
  }

  return (
    <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary">
          <MailCheck aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Email verification</h2>
          <p className="truncate text-xs text-muted-foreground">
            {session.user.email}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={state === "sending" || state === "sent"}
          onClick={() => void send()}
        >
          {state === "sending"
            ? "Sending"
            : state === "sent"
              ? "Sent"
              : "Verify"}
        </Button>
      </div>
      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Verification email is unavailable.
        </p>
      ) : null}
    </section>
  );
}
