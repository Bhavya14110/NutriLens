import "server-only";
import webpush, { type PushSubscription } from "web-push";
import { env } from "@/lib/env";

let ready = false;

export function pushReady() {
  const e = env();
  if (!e.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return false;
  if (!ready) {
    webpush.setVapidDetails(e.VAPID_SUBJECT, e.NEXT_PUBLIC_VAPID_PUBLIC_KEY, e.VAPID_PRIVATE_KEY);
    ready = true;
  }
  return true;
}

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

// returns "gone" when the browser dropped the subscription so the caller can delete it
export async function sendPush(sub: PushSubscription, msg: PushMsg): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: "normal" });
    return "ok";
  } catch (err) {
    const code = typeof err === "object" && err && "statusCode" in err ? Number(err.statusCode) : 0;
    if (code === 404 || code === 410) return "gone";
    console.warn("[push] send failed", code);
    return "error";
  }
}

export function isSub(x: unknown): x is PushSubscription {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  const keys = s.keys as Record<string, unknown> | undefined;
  return typeof s.endpoint === "string" && typeof keys?.p256dh === "string" && typeof keys?.auth === "string";
}
