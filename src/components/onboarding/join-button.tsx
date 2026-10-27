"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";

export function JoinButton({ code, onboarded }: { code: string; onboarded: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/household/join", { method: "POST", json: { code } });
      // new members still need to set allergens/diet before landing in the app
      router.replace(onboarded ? "/home" : "/onboarding");
      router.refresh();
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Couldn't join.");
    }
  }

  return (
    <>
      <Button className="mt-6 h-11 w-full" onClick={join} disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Join household
      </Button>
      {err && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {err}
        </p>
      )}
    </>
  );
}
