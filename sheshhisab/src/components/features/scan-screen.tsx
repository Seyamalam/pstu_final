"use client";

import { useQuery } from "convex/react";
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  SendHorizontal,
  Share2,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/motion/input";
import {
  createPayLink,
  isValidPayNote,
  type PayIntent,
  parsePayIntent,
  poishaToInput,
} from "@/lib/pay-link";
import { api } from "../../../convex/_generated/api";
import { parseBdtInput } from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type DetectedCode = { rawValue: string };
type Detector = { detect(source: CanvasImageSource): Promise<DetectedCode[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
const MAX_TRANSFER_AMOUNT_POISHA = 10_000_000_000n;

export function ScanScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const viewer = useQuery(api.viewer.get, {});
  const qr = useQuery(api.qr.mine, {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latchedRef = useRef(false);
  const [origin, setOrigin] = useState("");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (navigateTimerRef.current !== null) {
        clearTimeout(navigateTimerRef.current);
      }
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  if (viewer === undefined || viewer === null || qr === undefined) {
    return <ScreenLoading label="Opening scanner" />;
  }

  const stopCamera = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
    setScanning(false);
  };

  const openIntent = (intent: PayIntent) => {
    stopCamera();
    setDetected(true);
    navigator.vibrate?.(20);
    const next = new URLSearchParams({ to: intent.handle });
    if (intent.amountPoisha !== null) {
      next.set("amount", poishaToInput(intent.amountPoisha));
    }
    if (intent.note !== null) next.set("note", intent.note);
    navigateTimerRef.current = setTimeout(
      () => router.push(`/app/send?${next.toString()}`),
      reduceMotion ? 0 : 160,
    );
  };

  const submitManual = () => {
    const normalized = manual.trim().replace(/^@/, "").toLowerCase();
    const fromLink = origin ? parsePayIntent(manual.trim(), origin) : null;
    const intent =
      fromLink ??
      (/^[a-z0-9_]{3,24}$/.test(normalized)
        ? { handle: normalized, amountPoisha: null, note: null }
        : null);
    if (!intent) {
      setMessage("Enter a valid handle or SheshHisab QR link.");
      return;
    }
    openIntent(intent);
  };

  const startCamera = async () => {
    setMessage(null);
    setDetected(false);
    latchedRef.current = false;
    const DetectorApi = (
      window as typeof window & { BarcodeDetector?: DetectorConstructor }
    ).BarcodeDetector;
    if (!DetectorApi) {
      setMessage("QR camera scanning is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
        return;
      }
      video.srcObject = stream;
      await video.play();
      setScanning(true);
      const detector = new DetectorApi({ formats: ["qr_code"] });

      const scanFrame = async () => {
        if (!videoRef.current || latchedRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const intent =
            codes[0] && origin
              ? parsePayIntent(codes[0].rawValue, origin)
              : null;
          if (intent) {
            latchedRef.current = true;
            openIntent(intent);
            return;
          }
          frameRef.current = requestAnimationFrame(() => void scanFrame());
        } catch {
          stopCamera();
          setMessage("The camera scanner stopped. Try opening it again.");
        }
      };
      frameRef.current = requestAnimationFrame(() => void scanFrame());
    } catch {
      stopCamera();
      setMessage("Camera access was not granted.");
    }
  };

  const requestAmountPoisha = parseBdtInput(requestAmount);
  const requestAmountError =
    requestAmount.length > 0 &&
    (requestAmountPoisha === null ||
      requestAmountPoisha <= 0n ||
      requestAmountPoisha > MAX_TRANSFER_AMOUNT_POISHA)
      ? "Enter a valid amount."
      : undefined;
  const normalizedRequestNote = requestNote.trim();
  const requestNoteError =
    normalizedRequestNote && !isValidPayNote(normalizedRequestNote)
      ? "Remove unsupported characters."
      : undefined;
  let requestLink = qr?.payload ?? "";
  if (origin && !requestAmountError && !requestNoteError) {
    try {
      requestLink = createPayLink(origin, viewer.user.handle, {
        amountPoisha:
          requestAmountPoisha && requestAmountPoisha > 0n
            ? requestAmountPoisha
            : null,
        note: normalizedRequestNote || null,
      });
    } catch {
      requestLink = "";
    }
  }
  const requestInvalid =
    Boolean(requestAmountError || requestNoteError) || !requestLink;

  const copyRequest = async () => {
    if (requestInvalid) return;
    setShareMessage(null);
    try {
      await navigator.clipboard.writeText(requestLink);
      setShareState("copied");
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setShareState("idle"), 1_500);
    } catch {
      setShareMessage("Could not copy this request link.");
    }
  };

  const shareRequest = async () => {
    if (requestInvalid) return;
    setShareMessage(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SheshHisab request",
          text:
            requestAmountPoisha && requestAmountPoisha > 0n
              ? `Pay ৳${poishaToInput(requestAmountPoisha)}`
              : "Pay with SheshHisab",
          url: requestLink,
        });
      } else {
        await copyRequest();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Could not share this request link.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeading eyebrow="QR pay" title="Scan or share" />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
          <h2 className="text-base font-semibold">Scan to pay</h2>
          <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-foreground/5">
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full object-cover"
            />
            {!scanning ? (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Camera aria-hidden="true" className="size-8" />
              </div>
            ) : null}
            {scanning ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-5 rounded-2xl border border-white/70 shadow-[0_0_0_999px_rgb(0_0_0/0.22)]"
              />
            ) : null}
            {detected ? (
              <div className="absolute inset-0 grid place-items-center bg-primary/90 text-primary-foreground">
                <span className="grid size-16 place-items-center rounded-full bg-white/15 motion-safe:animate-[success-pop_240ms_cubic-bezier(0.16,1,0.3,1)]">
                  <Check aria-hidden="true" className="size-8" />
                </span>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            size="lg"
            variant={scanning ? "outline" : "primary"}
            onClick={scanning ? stopCamera : () => void startCamera()}
            className="mt-3 w-full"
          >
            {scanning ? (
              <CameraOff className="size-4" />
            ) : (
              <Camera className="size-4" />
            )}
            {scanning ? "Stop camera" : "Open camera"}
          </Button>
          <div className="mt-4 flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Handle or QR link"
                value={manual}
                onChange={(value) => {
                  setManual(value);
                  setMessage(null);
                }}
                placeholder="@handle"
              />
            </div>
            <Button
              type="button"
              onClick={submitManual}
              className="mt-6 size-11 px-0"
              aria-label="Continue"
            >
              <SendHorizontal aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {message ? (
            <div className="mt-3">
              <InlineError>{message}</InlineError>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col rounded-[1.75rem] bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="text-center">
            <h2 className="text-base font-semibold">Request with QR</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              @{viewer.user.handle}
            </p>
          </div>
          {qr ? (
            <div className="mx-auto mt-5 rounded-2xl bg-white p-4">
              <QRCode
                value={requestLink}
                size={220}
                bgColor="#ffffff"
                fgColor="#102a33"
              />
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount in BDT"
              value={requestAmount}
              onChange={(value) => {
                setRequestAmount(value);
                setShareState("idle");
                setShareMessage(null);
              }}
              inputMode="decimal"
              placeholder="Optional"
              error={requestAmountError}
              reserveErrorLine
            />
            <Input
              label="Note"
              value={requestNote}
              onChange={(value) => {
                setRequestNote(value);
                setShareState("idle");
                setShareMessage(null);
              }}
              maxLength={120}
              placeholder="Optional"
              error={requestNoteError}
              reserveErrorLine
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={requestInvalid}
              onClick={() => void copyRequest()}
            >
              {shareState === "copied" ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {shareState === "copied" ? "Copied" : "Copy link"}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={requestInvalid}
              onClick={() => void shareRequest()}
            >
              <Share2 aria-hidden="true" className="size-4" />
              Share
            </Button>
          </div>
          {shareMessage ? (
            <div className="mt-3">
              <InlineError>{shareMessage}</InlineError>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
