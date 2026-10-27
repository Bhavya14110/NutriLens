import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { RetryButton } from "@/components/common/retry-button";

export const metadata: Metadata = { title: "Offline" };

// pre-cached by the service worker and shown when a page can't load
export default function OfflinePage() {
  return (
    <div className="grain flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-accent text-accent-foreground">
          <WifiOff className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-muted-foreground">This page needs a connection. Pages you&apos;ve opened before — like your pantry — still work from the last saved copy.</p>
        <RetryButton />
      </div>
    </div>
  );
}
