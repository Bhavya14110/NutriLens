"use client";

import type { IScannerControls } from "@zxing/browser";
import { AnimatePresence, motion } from "framer-motion";
import { CameraOff, Flashlight, FlashlightOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "starting" | "live" | "denied" | "nocam" | "error";

// zxing in a <video>, restricted to retail barcode formats so it locks on faster
export function Camera({ onCode, paused }: { onCode: (code: string) => void; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const cb = useRef(onCode);
  const hold = useRef(paused);
  const [status, setStatus] = useState<Status>("starting");
  const [torch, setTorch] = useState<boolean | null>(null);

  useEffect(() => {
    cb.current = onCode;
    hold.current = paused;
  }, [onCode, paused]);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("nocam");
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        if (dead || !video.current) return;
        const ctl = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false }, video.current, (res) => {
          if (res && !hold.current) cb.current(res.getText());
        });
        if (dead) return ctl.stop();
        controls.current = ctl;
        setStatus("live");
        // torch is only on some Android Chrome builds; hide the button elsewhere
        const track = (video.current.srcObject as MediaStream | null)?.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        if (caps?.torch) setTorch(false);
      } catch (err) {
        if (dead) return;
        const name = err instanceof Error ? err.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "nocam" : "error");
      }
    })();
    return () => {
      dead = true;
      controls.current?.stop();
      controls.current = null;
    };
  }, []);

  async function flipTorch() {
    const track = (video.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as unknown as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  }

  return (
    <div className="relative size-full overflow-hidden bg-black">
      <video ref={video} className="size-full object-cover" muted playsInline aria-label="Camera preview" />

      {status === "live" && <ScanFrame />}

      {status !== "live" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
          {status === "starting" ? (
            <p className="animate-pulse text-sm text-white/80">Starting camera…</p>
          ) : (
            <div className="max-w-xs">
              <CameraOff className="mx-auto size-10 text-white/70" aria-hidden="true" />
              <p className="mt-3 font-medium">
                {status === "denied" ? "Camera access is blocked" : status === "nocam" ? "No camera found" : "The camera didn't start"}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {status === "denied" ? "Allow camera access in your browser settings, or type the barcode below." : "You can type the barcode number below instead."}
              </p>
            </div>
          )}
        </div>
      )}

      {torch !== null && (
        <Button
          variant="secondary"
          size="icon-lg"
          className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={flipTorch}
          aria-pressed={torch}
          aria-label={torch ? "Turn torch off" : "Turn torch on"}
        >
          {torch ? <FlashlightOff aria-hidden="true" /> : <Flashlight aria-hidden="true" />}
        </Button>
      )}
    </div>
  );
}

function ScanFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      {/* dim everything outside the window */}
      <div className="absolute inset-0 bg-black/45 [mask-image:radial-gradient(ellipse_150px_95px_at_center,transparent_99%,black_100%)]" />
      <motion.div
        className="relative h-[190px] w-[300px] max-w-[80vw]"
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {["top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
          <span key={c} className={`absolute size-10 border-white ${c}`} />
        ))}
        <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px_var(--primary)] [--scan-h:186px] [animation:scanline_1.6s_ease-in-out_infinite_alternate]" />
      </motion.div>
    </div>
  );
}

export function SuccessPulse({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none absolute inset-0 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true">
          <motion.span
            className="size-40 rounded-full border-4 border-primary bg-primary/20"
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
