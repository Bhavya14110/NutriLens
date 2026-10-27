"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { canonOptions, getCanon } from "@/lib/canon";
import type { CanonGroup } from "@/lib/canon-data";
import { cn } from "@/lib/utils";

const groupNames: Record<CanonGroup, string> = {
  dairy: "Dairy",
  grain: "Grains & flours",
  pulse: "Dals & beans",
  veg: "Vegetables",
  fruit: "Fruit",
  spice: "Spices",
  sauce: "Sauces & pastes",
  bev: "Drinks",
  protein: "Eggs, meat & fish",
  nut: "Nuts & dry fruit",
  sweet: "Sweet things",
  oil: "Oils",
  snack: "Snacks",
  bakery: "Bakery",
};

const grouped = Object.entries(groupNames).map(([g, label]) => ({ g, label, items: canonOptions.filter((o) => o.group === g) }));

// searchable "what is this?" select for when the resolver can't tell
export function CanonPicker({ value, onChange, id }: { value: string | null; onChange: (v: string | null) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const cur = getCanon(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" role="combobox" aria-expanded={open} className="h-11 w-full justify-between font-normal">
          <span className={cn("truncate", !cur && "text-muted-foreground")}>{cur ? cur.label : "Pick the base ingredient…"}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search milk, atta, paneer…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No match. Try a simpler word.</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Not sure / leave blank
                </CommandItem>
              </CommandGroup>
            )}
            {grouped.map((grp) => (
              <CommandGroup key={grp.g} heading={grp.label}>
                {grp.items.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.label} ${o.id}`}
                    onSelect={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", value === o.id ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
