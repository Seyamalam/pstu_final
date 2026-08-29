"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = "checking" | "available" | "installed" | "manual";

type PwaContextValue = {
  installState: InstallState;
  install: () => Promise<boolean>;
};

const PwaContext = createContext<PwaContextValue | null>(null);

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installState, setInstallState] = useState<InstallState>("checking");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    }

    const updateInstallState = () => {
      setInstallState(isStandalone() ? "installed" : "manual");
    };
    updateInstallState();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setInstallState("available");
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstallState("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      installState,
      async install() {
        if (!promptEvent) return false;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        setPromptEvent(null);
        setInstallState(choice.outcome === "accepted" ? "installed" : "manual");
        return choice.outcome === "accepted";
      },
    }),
    [installState, promptEvent],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const value = useContext(PwaContext);
  if (!value) throw new Error("usePwa must be used inside PwaProvider");
  return value;
}
