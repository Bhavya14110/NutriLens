"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton({ label = "Try again" }: { label?: string }) {
  return (
    <Button className="mt-6" onClick={() => window.location.reload()}>
      <RotateCw aria-hidden="true" /> {label}
    </Button>
  );
}
