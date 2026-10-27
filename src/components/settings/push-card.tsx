"use client";

import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";

type State = "loading" | "unsupported" | "nokey" | "denied" | "off" | "on";

const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function reg() {
  // the prod build registers sw on load; dev doesn't, so make sure it exists before subscribing
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

export function PushCard() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (!vapid) return setState("nokey");
      if (Notification.permission === "denied") return setState("denied");
      const r = await navigator.serviceWorker.getRegistration("/");
      const sub = await r?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const r = await reg();
      await navigator.serviceWorker.ready;
      const sub = (await r.pushManager.getSubscription()) ?? (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) }));
      await api("/api/push/subscribe", { method: "POST", json: { subscription: sub.toJSON() } });
      setState("on");
      toast.success("Reminders on. We'll nudge you at 9am when food is about to expire.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const r = await navigator.serviceWorker.getRegistration("/");
      const sub = await r?.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/subscribe", { method: "DELETE", json: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn off notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      await api("/api/push/test", { method: "POST" });
      toast.success("Test sent — it should pop up in a moment.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  }

  const msg: Record<State, string> = {
    loading: "Checking this device…",
    unsupported: "This browser can't do push notifications. On iPhone, add NutriLens to your Home Screen first.",
    nokey: "Push isn't configured on the server yet (missing VAPID key).",
    denied: "Notifications are blocked for this site. Allow them in your browser settings, then come back.",
    off: "Get a 9am heads-up when food in your pantry expires within 2 days.",
    on: "On for this device. You'll get a daily 9am reminder when something's about to expire.",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {msg[state]}
      </p>
      <div className="flex flex-wrap gap-2">
        {state === "off" && (
          <Button onClick={enable} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Bell aria-hidden="true" />} Enable reminders
          </Button>
        )}
        {state === "on" && (
          <>
            <Button variant="outline" onClick={test} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Send a test
            </Button>
            <Button variant="ghost" onClick={disable} disabled={busy}>
              <BellOff aria-hidden="true" /> Turn off
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
