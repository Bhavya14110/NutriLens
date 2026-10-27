"use client";

import { Loader2, Refrigerator } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CanonPicker } from "@/components/common/canon-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAddPantry } from "@/hooks/data";
import { defaultLoc, suggestExpiry } from "@/lib/canon";
import { newPantrySchema } from "@/lib/schemas";
import type { Loc } from "@/types/db";

export const UNITS = ["pcs", "g", "kg", "ml", "l", "pack", "bunch", "dozen"] as const;
export const LOCS: { id: Loc; label: string }[] = [
  { id: "fridge", label: "Fridge" },
  { id: "freezer", label: "Freezer" },
  { id: "shelf", label: "Shelf" },
];

type Seed = { name: string; barcode?: string | null; fruit?: string | null; canon: string | null; askCanon?: boolean };

// one sheet for barcode products, fresh fruit and manual items. expiry is pre-filled from the canon
export function AddToPantrySheet({ seed, trigger, onAdded }: { seed: Seed; trigger: ReactNode; onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-3xl">
        {open && (
          <AddForm
            seed={seed}
            done={() => {
              setOpen(false);
              onAdded?.();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function AddForm({ seed, done }: { seed: Seed; done: () => void }) {
  const add = useAddPantry();
  const [name, setName] = useState(seed.name);
  const [canon, setCanon] = useState<string | null>(seed.canon);
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<string>("pcs");
  const [loc, setLoc] = useState<Loc>(defaultLoc(seed.canon));
  const [exp, setExp] = useState(suggestExpiry(seed.canon, defaultLoc(seed.canon)));
  const [touchedExp, setTouchedExp] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // keep the suggestion in sync until the user picks their own date
  const pickCanon = (c: string | null) => {
    setCanon(c);
    const l = defaultLoc(c);
    setLoc(l);
    if (!touchedExp) setExp(suggestExpiry(c, l));
  };
  const pickLoc = (l: Loc) => {
    setLoc(l);
    if (!touchedExp) setExp(suggestExpiry(canon, l));
  };

  function submit() {
    const parsed = newPantrySchema.safeParse({ name, barcode: seed.barcode ?? null, fruit: seed.fruit ?? null, canon_ing: canon, qty, unit, location: loc, expires_at: exp || null });
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setErr(null);
    add.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(`${parsed.data.name} added to your ${loc}`);
        done();
      },
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-2xl">Add to pantry</SheetTitle>
        <SheetDescription>We&apos;ve guessed when it expires — change it if the pack says otherwise.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" maxLength={120} />
        </div>
        {(seed.askCanon || !seed.canon) && (
          <div className="space-y-1.5">
            <Label htmlFor="p-canon">What is it, basically?</Label>
            <CanonPicker id="p-canon" value={canon} onChange={pickCanon} />
            <p className="text-xs text-muted-foreground">Helps us match recipes and drinks. We&apos;ll remember it for next time.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-qty">Quantity</Label>
            <Input id="p-qty" type="number" inputMode="decimal" min="0.1" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-unit">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="p-unit" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Where does it live?</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Location">
            {LOCS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={loc === l.id}
                onClick={() => pickLoc(l.id)}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${loc === l.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="p-exp">Expires on</Label>
          <Input
            id="p-exp"
            type="date"
            value={exp}
            onChange={(e) => {
              setTouchedExp(true);
              setExp(e.target.value);
            }}
            className="h-11"
          />
        </div>
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
      </div>
      <SheetFooter>
        <Button className="h-12 w-full text-base" onClick={submit} disabled={add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Refrigerator aria-hidden="true" />}
          Add to pantry
        </Button>
      </SheetFooter>
    </>
  );
}
