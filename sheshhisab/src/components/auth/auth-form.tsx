"use client";

import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-next-path";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";
type FieldName = "displayName" | "handle" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

const modeCopy = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Sign in to your wallet",
    description: "",
    submit: "Sign in",
    loading: "Signing in",
    success: "Signed in",
  },
  "sign-up": {
    eyebrow: "Create your wallet",
    title: "Choose your handle",
    description: "",
    submit: "Create account",
    loading: "Creating account",
    success: "Account ready",
  },
} as const;

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function validateFields(
  mode: AuthMode,
  fields: Record<FieldName, string>,
): FieldErrors {
  const errors: FieldErrors = {};
  const email = fields.email.trim();

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (fields.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  } else if (fields.password.length > 128) {
    errors.password = "Use 128 characters or fewer.";
  }

  if (mode === "sign-up") {
    const displayName = fields.displayName.trim().replace(/\s+/g, " ");
    if (displayName.length < 2 || displayName.length > 60) {
      errors.displayName = "Use 2 to 60 characters.";
    }

    if (!HANDLE_PATTERN.test(normalizeHandle(fields.handle))) {
      errors.handle = "Use 3 to 24 lowercase letters, numbers, or underscores.";
    }
  }

  return errors;
}

function authErrorMessage(
  error: { code?: string; message?: string; status?: number },
  mode: AuthMode,
) {
  if (error.status === 429) {
    return "Too many attempts. Wait a moment, then try again.";
  }

  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "The email or password is incorrect.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account already exists for this email. Try signing in.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters for your password.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    default:
      return mode === "sign-in"
        ? "We could not sign you in. Check your details and try again."
        : "We could not create your account. Check your details and try again.";
  }
}

export function AuthForm() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [fields, setFields] = useState<Record<FieldName, string>>({
    displayName: "",
    handle: "",
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const copy = modeCopy[mode];
  const errors = validateFields(mode, fields);

  useEffect(() => {
    router.prefetch("/app");
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      setMode("sign-up");
    }
  }, [router]);

  const selectMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setTouched({});
    setGeneralError(null);
    setButtonState("idle");
    setShowPassword(false);
    setFields((current) => ({ ...current, password: "" }));
  };

  const updateField = (field: FieldName, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setGeneralError(null);
    if (buttonState !== "loading") setButtonState("idle");
  };

  const touchField = (field: FieldName) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (buttonState === "loading") return;

    const activeFields: FieldName[] =
      mode === "sign-up"
        ? ["displayName", "handle", "email", "password"]
        : ["email", "password"];
    setTouched(Object.fromEntries(activeFields.map((field) => [field, true])));

    const nextErrors = validateFields(mode, fields);
    if (activeFields.some((field) => nextErrors[field])) {
      setButtonState("error");
      return;
    }

    setGeneralError(null);
    setButtonState("loading");

    const email = fields.email.trim().toLowerCase();
    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password: fields.password })
        : await authClient.signUp.email({
            name: fields.displayName.trim().replace(/\s+/g, " "),
            email,
            password: fields.password,
          });

    if (result.error) {
      setGeneralError(authErrorMessage(result.error, mode));
      setButtonState("error");
      return;
    }

    if (mode === "sign-up") {
      sessionStorage.setItem(
        "sheshhisab.pendingProfile",
        JSON.stringify({
          displayName: fields.displayName.trim().replace(/\s+/g, " "),
          handle: normalizeHandle(fields.handle),
        }),
      );
    }

    const nextPath = safeNextPath(
      new URLSearchParams(window.location.search).get("next"),
    );
    setButtonState("success");
    router.replace(nextPath);
    router.refresh();
  };

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="auth-title"
      className="w-full max-w-md rounded-[1.75rem] border border-foreground/10 bg-card p-5 shadow-[0_1px_0_rgb(16_42_51/0.05),0_24px_70px_rgb(16_42_51/0.10)] sm:p-7"
    >
      <fieldset>
        <legend className="sr-only">Choose how to continue</legend>
        <div className="relative grid grid-cols-2 rounded-full bg-muted p-1">
          {(["sign-in", "sign-up"] as const).map((value) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => selectMode(value)}
                className={cn(
                  "relative isolate min-h-10 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="auth-mode"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 30,
                    }}
                  />
                ) : null}
                {value === "sign-in" ? "Sign in" : "Create account"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="pb-6 pt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {copy.eyebrow}
        </p>
        <h1
          id="auth-title"
          className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-foreground"
        >
          {copy.title}
        </h1>
        {copy.description ? (
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
        ) : null}
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {mode === "sign-up" ? (
            <motion.div
              key="profile-fields"
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }
              }
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }
              }
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <Input
                id="display-name"
                label="Display name"
                name="name"
                value={fields.displayName}
                onChange={(value) => updateField("displayName", value)}
                onBlur={() => touchField("displayName")}
                error={touched.displayName ? errors.displayName : undefined}
                success={Boolean(touched.displayName && !errors.displayName)}
                reserveErrorLine
                autoComplete="name"
                placeholder="Sadia Rahman"
                leftIcon={<UserRound aria-hidden />}
              />
              <Input
                id="handle"
                label="Handle"
                name="handle"
                value={fields.handle}
                onChange={(value) => updateField("handle", value)}
                onBlur={() => touchField("handle")}
                error={touched.handle ? errors.handle : undefined}
                success={Boolean(touched.handle && !errors.handle)}
                reserveErrorLine
                autoCapitalize="none"
                autoComplete="nickname"
                spellCheck={false}
                placeholder="sadia_24"
                leftIcon={<AtSign aria-hidden />}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Input
          id="email"
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          onChange={(value) => updateField("email", value)}
          onBlur={() => touchField("email")}
          error={touched.email ? errors.email : undefined}
          success={Boolean(touched.email && !errors.email)}
          reserveErrorLine
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="you@example.com"
          leftIcon={<Mail aria-hidden />}
        />

        <Input
          id="password"
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={fields.password}
          onChange={(value) => updateField("password", value)}
          onBlur={() => touchField("password")}
          error={touched.password ? errors.password : undefined}
          success={Boolean(touched.password && !errors.password)}
          reserveErrorLine
          autoComplete={
            mode === "sign-up" ? "new-password" : "current-password"
          }
          placeholder={
            mode === "sign-up" ? "At least 8 characters" : "Your password"
          }
          leftIcon={<LockKeyhole aria-hidden />}
          rightIcon={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </button>
          }
        />

        <div className="min-h-10 pt-0.5" aria-live="polite">
          <AnimatePresence initial={false}>
            {generalError ? (
              <motion.p
                role="alert"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {generalError}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <StatefulButton
          type="submit"
          size="lg"
          state={buttonState}
          loadingText={copy.loading}
          successText={copy.success}
          errorText="Check and try again"
          icon={<ArrowRight aria-hidden />}
          className="w-full"
          ripple
        >
          {copy.submit}
        </StatefulButton>
      </form>
    </motion.section>
  );
}
