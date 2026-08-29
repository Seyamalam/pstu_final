"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Building2,
  ChartNoAxesColumnIncreasing,
  House,
  LogOut,
  MoreHorizontal,
  QrCode,
  ReceiptText,
  ScanLine,
  SendHorizontal,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { type AppNavigationItem, AppShell } from "@/components/app/app-shell";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { NotificationBell } from "@/components/features/notification-bell";
import { WalletSwitcher } from "@/components/features/wallet-switcher";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";

import { errorMessage, normalizeHandleInput } from "./money";
import { InlineError, ScreenLoading } from "./screen-states";

const PENDING_PROFILE_KEY = "sheshhisab.pendingProfile";
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

type PendingProfile = {
  handle: string;
  displayName: string;
};

function readPendingProfile(): PendingProfile | null {
  try {
    const value = sessionStorage.getItem(PENDING_PROFILE_KEY);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("handle" in parsed) ||
      !("displayName" in parsed) ||
      typeof parsed.handle !== "string" ||
      typeof parsed.displayName !== "string"
    ) {
      sessionStorage.removeItem(PENDING_PROFILE_KEY);
      return null;
    }
    return { handle: parsed.handle, displayName: parsed.displayName };
  } catch {
    sessionStorage.removeItem(PENDING_PROFILE_KEY);
    return null;
  }
}

function OnboardingForm({
  suggestedDisplayName,
}: {
  suggestedDisplayName?: string | null;
}) {
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? "");
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const normalizedHandle = normalizeHandleInput(handle);
  const handleError =
    handle.length > 0 && !HANDLE_PATTERN.test(normalizedHandle)
      ? "Use 3 to 24 lowercase letters, numbers, or underscores."
      : undefined;
  const normalizedName = displayName.trim().replace(/\s+/g, " ");
  const nameError =
    displayName.length > 0 &&
    (normalizedName.length < 2 || normalizedName.length > 60)
      ? "Use 2 to 60 characters."
      : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;
    if (!HANDLE_PATTERN.test(normalizedHandle) || normalizedName.length < 2) {
      setMessage("Enter a valid display name and handle.");
      setState("error");
      return;
    }

    setMessage(null);
    setState("loading");
    try {
      await ensureCurrent({
        handle: normalizedHandle,
        displayName: normalizedName,
      });
      sessionStorage.removeItem(PENDING_PROFILE_KEY);
      setState("success");
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          "We could not create this wallet. Try another handle.",
        ),
      );
      setState("error");
    }
  };

  return (
    <main className="min-h-dvh px-4 py-5 sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Brand href="/" />
        <span className="rounded-full bg-muted px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Step 2 of 2
        </span>
      </header>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 py-10 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-16 lg:py-14">
        <section aria-labelledby="onboarding-title" className="max-w-xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            WALLET SETUP
          </p>
          <h1
            id="onboarding-title"
            className="mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-foreground sm:text-5xl"
          >
            One handle. Every হিসাব.
          </h1>
          <div className="mt-7 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                icon: QrCode,
                title: "Scan to pay",
                detail: "No account number",
              },
              {
                icon: ReceiptText,
                title: "Clear receipts",
                detail: "Every payment",
              },
              {
                icon: Building2,
                title: "Team wallets",
                detail: "Roles and access",
              },
            ].map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card/80 p-3.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 shadow-[0_1px_0_rgb(16_42_51/0.05),0_24px_70px_rgb(16_42_51/0.10)] sm:p-7">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            PROFILE
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Name your wallet.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your handle is how people find you.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="mt-6 flex flex-col gap-3"
          >
            <Input
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
              placeholder="Your name"
              error={nameError}
              reserveErrorLine
              disabled={state === "loading"}
            />
            <Input
              label="Handle"
              value={handle}
              onChange={setHandle}
              autoComplete="username"
              placeholder="your_handle"
              error={handleError}
              reserveErrorLine
              disabled={state === "loading"}
            />
            {message ? <InlineError>{message}</InlineError> : null}
            <StatefulButton
              type="submit"
              size="lg"
              state={state}
              loadingText="Creating wallet"
              successText="Wallet ready"
              errorText="Try again"
              className="w-full"
            >
              Open wallet
            </StatefulButton>
          </form>
        </section>
      </div>
    </main>
  );
}

function navigationForPath(pathname: string): AppNavigationItem[] {
  const items = [
    { href: "/app", label: "Home", icon: House },
    { href: "/app/send", label: "Pay", icon: SendHorizontal },
    { href: "/app/scan", label: "Scan", icon: ScanLine },
    {
      href: "/app/activity",
      label: "Activity",
      icon: ChartNoAxesColumnIncreasing,
    },
    { href: "/app/more", label: "More", icon: MoreHorizontal },
  ];

  return items.map((item) => ({
    ...item,
    active:
      item.href === "/app"
        ? pathname === "/app"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
}

export function WalletFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const session = authClient.useSession();
  const viewer = useQuery(api.viewer.get, isAuthenticated ? {} : "skip");
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const autoAttemptedRef = useRef(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [autoBootstrapping, setAutoBootstrapping] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const query = searchParams.toString();
      const next = query ? `${pathname}?${query}` : pathname;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router, searchParams]);

  useEffect(() => {
    if (!isAuthenticated || viewer !== null || autoAttemptedRef.current) return;
    const pendingProfile = readPendingProfile();
    if (!pendingProfile) return;

    autoAttemptedRef.current = true;
    setAutoBootstrapping(true);
    setBootstrapError(null);
    void ensureCurrent(pendingProfile)
      .then(() => {
        sessionStorage.removeItem(PENDING_PROFILE_KEY);
      })
      .catch((error: unknown) => {
        setBootstrapError(
          errorMessage(
            error,
            "We could not finish creating your wallet. Check the details below.",
          ),
        );
      })
      .finally(() => setAutoBootstrapping(false));
  }, [ensureCurrent, isAuthenticated, viewer]);

  if (
    isLoading ||
    session.isPending ||
    (isAuthenticated && viewer === undefined)
  ) {
    return <ScreenLoading label="Opening your wallet" />;
  }

  if (!isAuthenticated || !session.data) {
    return <ScreenLoading label="Taking you to sign in" />;
  }

  if (viewer === undefined) {
    return <ScreenLoading label="Opening your wallet" />;
  }

  if (viewer === null) {
    if (autoBootstrapping)
      return <ScreenLoading label="Creating your wallet" />;
    return (
      <div>
        {bootstrapError ? (
          <div className="mx-auto max-w-md px-4 pt-8">
            <InlineError>{bootstrapError}</InlineError>
          </div>
        ) : null}
        <OnboardingForm suggestedDisplayName={session.data.user.name} />
      </div>
    );
  }

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <AppShell
      navigation={navigationForPath(pathname)}
      pageLabel={`@${viewer.user.handle}`}
      headerActions={
        <>
          <WalletSwitcher />
          <NotificationBell />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="grid size-11 place-items-center rounded-xl text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
