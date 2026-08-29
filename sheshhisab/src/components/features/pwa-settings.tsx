"use client";

import { useMutation } from "convex/react";
import { Bell, BellOff, Check, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { usePwa } from "@/components/app/pwa-provider";
import { Button } from "@/components/ui/button";
import {
  decodeVapidPublicKey,
  type PushAvailability,
  type PushPermission,
  resolvePushAvailability,
  supportsWebPush,
  toPushSubscriptionPayload,
} from "@/lib/pwa";
import { api } from "../../../convex/_generated/api";

function browserSupportsPush(): boolean {
  return supportsWebPush({
    secureContext: window.isSecureContext,
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    notifications: "Notification" in window,
  });
}

function availabilityCopy(state: PushAvailability): string {
  switch (state) {
    case "blocked":
      return "Allow notifications in your browser settings.";
    case "ready":
      return "Get an alert when money moves.";
    case "subscribed":
      return "Alerts are enabled on this device.";
    case "unconfigured":
      return "Payment alerts are coming soon on web.";
    default:
      return "Notifications are unavailable in this browser.";
  }
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-20 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function PwaSettings() {
  const { install, installState } = usePwa();
  const registerEndpoint = useMutation(api.notifications.registerEndpoint);
  const unregisterEndpoint = useMutation(
    api.notifications.unregisterCurrentEndpoint,
  );
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextSupported = browserSupportsPush();
    setSupported(nextSupported);
    if (!nextSupported) return;

    setPermission(Notification.permission);
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(setSubscription)
      .catch(() => setMessage("Could not read notification settings."));
  }, []);

  const pushState = useMemo(
    () =>
      resolvePushAvailability({
        supported,
        permission,
        configured: Boolean(vapidPublicKey),
        subscribed: subscription !== null,
      }),
    [permission, subscription, supported, vapidPublicKey],
  );

  const enablePush = async () => {
    if (pushState !== "ready" || busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const nextSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(vapidPublicKey),
      });
      const payload = toPushSubscriptionPayload(nextSubscription.toJSON());
      await registerEndpoint({
        platform: "web",
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        deviceLabel: navigator.platform || "Web browser",
      });
      setSubscription(nextSubscription);
    } catch {
      setMessage("Could not enable payment alerts.");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    if (!subscription || busy) return;
    setBusy(true);
    setMessage(null);

    try {
      await unregisterEndpoint({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      setSubscription(null);
    } catch {
      setMessage("Could not turn off payment alerts.");
    } finally {
      setBusy(false);
    }
  };

  const showLocalAlert = async () => {
    if (!supported || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("SheshHisab", {
        body: "Alerts are ready on this device.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "sheshhisab-device-ready",
        data: { url: "/app/more" },
      });
    } catch {
      setMessage("Could not show an alert on this device.");
    } finally {
      setBusy(false);
    }
  };

  const installDescription =
    installState === "installed"
      ? "Installed on this device."
      : installState === "available"
        ? "Open your wallet from the home screen."
        : "Use your browser menu to add SheshHisab to the home screen.";

  return (
    <section
      className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10"
      aria-label="App settings"
    >
      <SettingsRow
        icon={installState === "installed" ? Check : Download}
        title="SheshHisab app"
        description={installDescription}
      >
        {installState === "available" ? (
          <Button type="button" size="lg" onClick={() => void install()}>
            Install
          </Button>
        ) : null}
      </SettingsRow>
      <div className="border-t border-border">
        <SettingsRow
          icon={pushState === "blocked" ? BellOff : Bell}
          title="Payment alerts"
          description={message ?? availabilityCopy(pushState)}
        >
          {pushState === "ready" ? (
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={() => void enablePush()}
            >
              Enable
            </Button>
          ) : null}
          {pushState === "subscribed" ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => void disablePush()}
            >
              Turn off
            </Button>
          ) : null}
          {(pushState === "unconfigured" || pushState === "ready") &&
          permission !== "denied" ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => void showLocalAlert()}
            >
              Check alerts
            </Button>
          ) : null}
        </SettingsRow>
      </div>
    </section>
  );
}
