"use client";

import { motion } from "framer-motion";
import type { Bar, Light } from "@/lib/health";
import { cn } from "@/lib/utils";

const tone: Record<Light, { bar: string; text: string; word: string }> = {
  low: { bar: "bg-fresh", text: "text-fresh", word: "Low" },
  medium: { bar: "bg-soon", text: "text-[color-mix(in_oklch,var(--soon),black_30%)] dark:text-soon", word: "Medium" },
  high: { bar: "bg-expired", text: "text-expired", word: "High" },
};

export function NutrientBars({ bars }: { bars: Bar[] }) {
  return (
    <ul className="space-y-4">
      {bars.map((b, i) => {
        const t = b.light ? tone[b.light] : null;
        // protein's colours are flipped (green = lots), so say it in words too
        const word = !b.light ? "No data" : b.goodWhenHigh ? { low: "Good source", medium: "Some", high: "Low" }[b.light] : t?.word;
        const pct = b.value === null ? 0 : Math.min(100, (b.value / b.max) * 100);
        return (
          <li key={b.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{b.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{b.value === null ? "—" : `${b.value} g`}</span>
                <span className={cn("ml-2 text-xs font-semibold", t?.text ?? "text-muted-foreground")}>{word}</span>
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label={`${b.label} per 100 g`}
              aria-valuemin={0}
              aria-valuemax={b.max}
              aria-valuenow={b.value ?? 0}
              aria-valuetext={b.value === null ? "not available" : `${b.value} grams, ${word}`}
            >
              <motion.div className={cn("h-full rounded-full", t?.bar ?? "bg-muted-foreground/30")} initial={{ width: 0 }} animate={{ width: `${Math.max(pct, b.value ? 2 : 0)}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: "easeOut" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SugarCompare({ productSugar, fruit, fruitSugar }: { productSugar: number | null; fruit: string; fruitSugar: number }) {
  const max = Math.max(productSugar ?? 0, fruitSugar, 1);
  const rows = [
    { label: "This product", v: productSugar, cls: "bg-soon" },
    { label: `Real ${fruit.toLowerCase()}`, v: fruitSugar, cls: "bg-fresh" },
  ];
  const ratio = productSugar !== null && fruitSugar > 0 ? productSugar / fruitSugar : null;
  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{r.label}</span>
              <span className="font-semibold tabular-nums">{r.v === null ? "—" : `${r.v} g sugar`} / 100 g</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div className={cn("h-full rounded-full", r.cls)} initial={{ width: 0 }} animate={{ width: `${((r.v ?? 0) / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.1 }} />
            </div>
          </li>
        ))}
      </ul>
      {ratio !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          {ratio > 1.15
            ? `That's about ${ratio.toFixed(1)}× the sugar of the actual fruit.`
            : ratio < 0.85
              ? "Less sugar than the fruit itself — nice."
              : "About the same sugar as the real fruit."}{" "}
          Whole fruit also brings fibre that juice leaves behind.
        </p>
      )}
    </div>
  );
}
