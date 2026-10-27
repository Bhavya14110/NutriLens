"use client";

import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ALLERGENS } from "@/lib/allergens";
import { DIETS } from "@/lib/diet";
import { cn } from "@/lib/utils";
import type { Diet } from "@/types/db";

export type Prefs = { allergens: string[]; diet: Diet; alcohol_ok: boolean };

// shared by onboarding and settings so the two never drift apart
export function PrefsFields({ value, onChange }: { value: Prefs; onChange: (v: Prefs) => void }) {
  const toggle = (id: string) =>
    onChange({ ...value, allergens: value.allergens.includes(id) ? value.allergens.filter((a) => a !== id) : [...value.allergens, id] });

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">Allergies</legend>
        <p className="mb-3 text-xs text-muted-foreground">We&apos;ll flag any scanned product that contains these — for you and your housemates.</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => {
            const on = value.allergens.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on ? "border-destructive/40 bg-destructive/10 text-destructive" : "hover:bg-muted",
                )}
              >
                {on && <Check className="size-3.5" aria-hidden="true" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Diet</legend>
        <div role="radiogroup" aria-label="Diet" className="grid gap-2 sm:grid-cols-2">
          {DIETS.map((d) => {
            const on = value.diet === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...value, diet: d.id })}
                className={cn("rounded-2xl border p-3 text-left transition-colors", on ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted")}
              >
                <span className="block text-sm font-medium">{d.label}</span>
                <span className="block text-xs text-muted-foreground">{d.blurb}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-2xl border p-4">
        <div>
          <Label htmlFor="alcohol">Show drinks with alcohol</Label>
          <p className="text-xs text-muted-foreground">Only kicks in when everyone in your household says yes.</p>
        </div>
        <Switch id="alcohol" checked={value.alcohol_ok} onCheckedChange={(v) => onChange({ ...value, alcohol_ok: v })} />
      </div>
    </div>
  );
}
