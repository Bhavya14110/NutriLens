"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CanonPicker } from "@/components/common/canon-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatchPantry } from "@/hooks/data";
import { isoDate } from "@/lib/schemas";
import type { PantryView } from "@/types/api";
import type { Loc } from "@/types/db";
import { LOCS, UNITS } from "./add-sheet";

export function PartUseDialog({ item, open, onOpenChange }: { item: PantryView; open: boolean; onOpenChange: (v: boolean) => void }) {
  const patch = usePatchPantry();
  const [amt, setAmt] = useState(String(Math.round((item.qty / 2) * 100) / 100));
  const [err, setErr] = useState<string | null>(null);
  const fracs = [0.25, 0.5, 0.75];

  function save() {
    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter how much you used.");
    if (n > item.qty) return setErr(`You only have ${item.qty} ${item.unit}.`);
    patch.mutate(
      { id: item.id, patch: { useQty: n } },
      {
        onSuccess: (r) => {
          toast.success(r.status === "used" ? `${item.name} finished — nice.` : `${r.qty} ${item.unit} of ${item.name} left.`);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How much {item.name} did you use?</DialogTitle>
          <DialogDescription>
            You have {item.qty} {item.unit}. We&apos;ll keep the rest in the pantry.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {fracs.map((f) => (
            <Button key={f} variant="outline" size="sm" onClick={() => setAmt(String(Math.round(item.qty * f * 100) / 100))}>
              {f * 100}%
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amt">Used ({item.unit})</Label>
          <Input id="amt" type="number" inputMode="decimal" step="any" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} className="h-11" />
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={patch.isPending}>
            {patch.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({ item, open, onOpenChange }: { item: PantryView; open: boolean; onOpenChange: (v: boolean) => void }) {
  const patch = usePatchPantry();
  const [qty, setQty] = useState(String(item.qty));
  const [unit, setUnit] = useState(item.unit);
  const [exp, setExp] = useState(item.expires_at ?? "");
  const [loc, setLoc] = useState<Loc>(item.location);
  const [canon, setCanon] = useState<string | null>(item.canon_ing);
  const [err, setErr] = useState<string | null>(null);

  function save() {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) return setErr("Quantity must be more than 0.");
    if (exp && !isoDate.safeParse(exp).success) return setErr("Pick a valid date.");
    patch.mutate(
      { id: item.id, patch: { qty: q, unit, expires_at: exp || null, location: loc, canon_ing: canon } },
      {
        onSuccess: () => {
          toast.success("Saved");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
          <DialogDescription>Fix the expiry, amount or where it lives.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-qty">Quantity</Label>
              <Input id="e-qty" type="number" inputMode="decimal" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="e-unit" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...UNITS, item.unit])].map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-exp">Expires on</Label>
            <Input id="e-exp" type="date" value={exp} onChange={(e) => setExp(e.target.value)} className="h-11" />
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Location">
            {LOCS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={loc === l.id}
                onClick={() => setLoc(l.id)}
                className={`h-10 rounded-xl border text-sm font-medium ${loc === l.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-canon">Base ingredient</Label>
            <CanonPicker id="e-canon" value={canon} onChange={setCanon} />
          </div>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={patch.isPending}>
            {patch.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
