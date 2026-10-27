"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div role="alert" className="max-w-sm text-center">
        <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">This screen hit a snag</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong loading it. Your pantry data is safe — try again, or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw aria-hidden="true" /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/home">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
