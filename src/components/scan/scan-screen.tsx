"use client";

import { useQuery } from "@tanstack/react-query";
import { Apple, Barcode, ChevronRight, Keyboard, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/fetcher";
import type { ScanRes } from "@/types/api";
import { Camera, SuccessPulse } from "./camera";

export function ScanScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("barcode");
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [manual, setManual] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handle = useCallback(
    async (code: string) => {
      if (busy) return;
      const clean = code.replace(/\D/g, "");
      if (!/^\d{6,14}$/.test(clean)) return setErr("Barcodes are 6 to 14 digits — check the number under the stripes.");
      setErr(null);
      setBusy(true);
      setPulse(true);
      navigator.vibrate?.(60);
      try {
        const res = await api<ScanRes>("/api/scan", { method: "POST", json: { barcode: clean } });
        if (res.ticked) toast.success(`Ticked “${res.ticked.name}” off your list${res.added ? " and added it to the pantry" : ""}.`);
        router.push(`/product/${clean}`);
      } catch (e) {
        setBusy(false);
        setPulse(false);
        setErr(e instanceof Error ? e.message : "Scan failed. Try again.");
      }
    },
    [busy, router],
  );

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    void handle(manual);
  };

  return (
    <div className="flex h-dvh flex-col bg-background md:h-[calc(100dvh)]">
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button asChild variant="ghost" size="icon" aria-label="Close scanner">
            <Link href="/home">
              <X aria-hidden="true" />
            </Link>
          </Button>
          <TabsList className="h-10 flex-1">
            <TabsTrigger value="barcode" className="h-8 gap-1.5">
              <Barcode className="size-4" aria-hidden="true" /> Barcode
            </TabsTrigger>
            <TabsTrigger value="fruit" className="h-8 gap-1.5">
              <Apple className="size-4" aria-hidden="true" /> Fresh fruit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="barcode" className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {tab === "barcode" && <Camera onCode={handle} paused={busy} />}
            <SuccessPulse show={pulse} />
            {busy && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Looking it up…
                </span>
              </div>
            )}
            {!busy && (
              <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white drop-shadow">Point at the barcode on the pack</p>
            )}
          </div>
          <form onSubmit={submitManual} className="pb-safe space-y-2 border-t bg-background p-4">
            <Label htmlFor="manual" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Keyboard className="size-3.5" aria-hidden="true" /> Or type the barcode number
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 8901058000290"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="h-11 font-mono"
                aria-invalid={Boolean(err)}
                aria-describedby={err ? "scan-err" : undefined}
              />
              <Button type="submit" className="h-11 px-5" disabled={busy || !manual.trim()}>
                Look up
              </Button>
            </div>
            {err && (
              <p id="scan-err" role="alert" className="text-sm text-destructive">
                {err}
              </p>
            )}
          </form>
        </TabsContent>

        <TabsContent value="fruit" className="min-h-0 flex-1 overflow-y-auto">
          <FruitSearch />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type FruitHit = { name: string; family: string; sugar: number; calories: number };

function FruitSearch() {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());
  // one fetch for the full list, filtering as you type happens in the browser
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["fruits"], queryFn: () => api<{ fruits: FruitHit[] }>("/api/fruit"), staleTime: 60 * 60_000 });
  const hits = (data?.fruits ?? []).filter((f) => !dq || f.name.toLowerCase().includes(dq));

  return (
    <div className="mx-auto max-w-lg p-4">
      <Label htmlFor="fruit-q" className="sr-only">
        Search fruit
      </Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id="fruit-q" autoFocus placeholder="Banana, mango, guava…" value={q} onChange={(e) => setQ(e.target.value)} className="h-12 pl-9 text-base" role="combobox" aria-expanded={hits.length > 0} aria-controls="fruit-list" aria-autocomplete="list" />
      </div>
      {isLoading && (
        <div className="mt-4 space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}
      {error && (
        <div className="mt-4 text-center text-sm">
          <p className="text-destructive">{error.message}</p>
          <Button variant="link" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      <ul id="fruit-list" className="mt-3 divide-y overflow-hidden rounded-2xl border">
        {hits.slice(0, 30).map((f) => (
          <li key={f.name}>
            <Link href={`/fruit/${encodeURIComponent(f.name.toLowerCase())}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted focus-visible:bg-muted">
              <span>
                <span className="block font-medium">{f.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {f.calories} kcal · {f.sugar} g sugar / 100 g
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
        {data && hits.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No fruit called “{q}”. Try a simpler name like “apple”.</li>}
      </ul>
    </div>
  );
}
