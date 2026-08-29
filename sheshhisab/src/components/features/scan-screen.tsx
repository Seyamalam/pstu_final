"use client";

import { useQuery } from "convex/react";
import { Camera, CameraOff, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/motion/input";
import { parsePayLink } from "@/lib/pay-link";
import { api } from "../../../convex/_generated/api";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type DetectedCode = { rawValue: string };
type Detector = { detect(source: CanvasImageSource): Promise<DetectedCode[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function ScanScreen() {
  const router = useRouter();
  const viewer = useQuery(api.viewer.get, {});
  const qr = useQuery(api.qr.mine, {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const latchedRef = useRef(false);
  const [origin, setOrigin] = useState("");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
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

  const openHandle = (handle: string) => {
    stopCamera();
    router.push(`/app/send?to=${encodeURIComponent(handle)}`);
  };

  const submitManual = () => {
    const normalized = manual.trim().replace(/^@/, "").toLowerCase();
    const fromLink = origin ? parsePayLink(manual.trim(), origin) : null;
    const handle =
      fromLink ?? (/^[a-z0-9_]{3,24}$/.test(normalized) ? normalized : null);
    if (!handle) {
      setMessage("Enter a valid handle or SheshHisab QR link.");
      return;
    }
    openHandle(handle);
  };

  const startCamera = async () => {
    setMessage(null);
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
          const handle =
            codes[0] && origin ? parsePayLink(codes[0].rawValue, origin) : null;
          if (handle) {
            latchedRef.current = true;
            openHandle(handle);
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

        <section className="flex flex-col items-center justify-center rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-foreground/10 sm:p-8">
          <h2 className="text-base font-semibold">Your payment QR</h2>
          {qr ? (
            <div className="mt-5 rounded-2xl bg-white p-4">
              <QRCode
                value={qr.payload}
                size={220}
                bgColor="#ffffff"
                fgColor="#102a33"
              />
            </div>
          ) : null}
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            @{viewer.user.handle}
          </p>
        </section>
      </div>
    </div>
  );
}
