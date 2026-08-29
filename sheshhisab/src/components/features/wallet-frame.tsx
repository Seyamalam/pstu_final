"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ChartNoAxesColumnIncreasing,
  House,
  LogOut,
  MoreHorizontal,
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
import { ThemeToggle } from "@/components/app/theme-toggle";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";

import { errorMessage, initials, normalizeHandleInput } from "./money";
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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          One last step
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
          Name your wallet.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          People will use your handle to find you.
        </p>

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-3">
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
            Create wallet
          </StatefulButton>
        </form>
      </section>
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
          <span className="hidden items-center gap-2 sm:flex">
            <span className="grid size-8 place-items-center rounded-xl bg-muted font-mono text-[10px] font-semibold">
              {initials(viewer.user.displayName)}
            </span>
            <span className="max-w-36 truncate text-sm font-medium">
              {viewer.user.displayName}
            </span>
          </span>
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
