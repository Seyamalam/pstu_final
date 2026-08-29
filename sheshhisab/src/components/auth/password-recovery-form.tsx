"use client";

import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { authClient } from "@/lib/auth-client";
import {
  normalizeRecoveryEmail,
  validateNewPassword,
  validResetToken,
} from "@/lib/auth-recovery";

function RecoveryCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full max-w-md rounded-[1.75rem] border border-foreground/10 bg-card p-5 shadow-[0_24px_70px_rgb(16_42_51/0.10)] sm:p-6">
      {children}
    </section>
  );
}

export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ButtonState>("idle");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeRecoveryEmail(email);
    if (!normalized) {
      setError("Enter a valid email address.");
      setState("error");
      return;
    }
    setError(null);
    setState("loading");
    const result = await authClient.requestPasswordReset({
      email: normalized,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (result.error) {
      setError("Password reset is unavailable right now.");
      setState("error");
      return;
    }
    setSent(true);
    setState("success");
  }

  return (
    <RecoveryCard>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Account access
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
        Reset password
      </h1>
      {sent ? (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            If the account exists, check your email.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft aria-hidden className="size-4" /> Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setError(null);
              setState("idle");
            }}
            error={error ?? undefined}
            leftIcon={<Mail aria-hidden />}
          />
          <StatefulButton
            type="submit"
            size="lg"
            state={state}
            loadingText="Sending"
            successText="Sent"
            errorText="Try again"
            icon={<ArrowRight aria-hidden />}
          >
            Send reset link
          </StatefulButton>
          <Link
            href="/login"
            className="min-h-11 self-start py-3 text-sm font-semibold text-primary"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </RecoveryCard>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ButtonState>("idle");
  const [complete, setComplete] = useState(false);
  const tokenIsValid = validResetToken(token);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateNewPassword(password, confirmation);
    if (!tokenIsValid || validation) {
      setError(
        tokenIsValid ? validation : "This reset link is invalid or expired.",
      );
      setState("error");
      return;
    }
    setError(null);
    setState("loading");
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (result.error) {
      setError("This reset link is invalid or expired.");
      setState("error");
      return;
    }
    setComplete(true);
    setState("success");
  }

  return (
    <RecoveryCard>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Account access
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
        Choose a new password
      </h1>
      {complete ? (
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
        >
          Sign in <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            leftIcon={<KeyRound aria-hidden />}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={setConfirmation}
            error={error ?? undefined}
            leftIcon={<KeyRound aria-hidden />}
          />
          <StatefulButton
            type="submit"
            size="lg"
            state={state}
            loadingText="Updating"
            successText="Updated"
            errorText="Check details"
            icon={<ArrowRight aria-hidden />}
            disabled={!tokenIsValid}
          >
            Update password
          </StatefulButton>
        </form>
      )}
    </RecoveryCard>
  );
}
