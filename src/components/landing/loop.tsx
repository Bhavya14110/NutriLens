"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calculator, ChefHat, HeartPulse, Refrigerator, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const steps = [
  { icon: ScanLine, title: "Scan", body: "Point at any barcode, or add fresh fruit by name." },
  { icon: HeartPulse, title: "Score", body: "Nutri-Score, NOVA, allergens and a real-fruit check." },
  { icon: Refrigerator, title: "Store", body: "Into the shared pantry with a smart expiry date." },
  { icon: ChefHat, title: "Use", body: "Recipes ranked by what's about to expire." },
  { icon: Calculator, title: "Shop", body: "Missing bits go on the list, with a ₹ estimate." },
];

// the five-step loop going round; reduced-motion users get a static list
export function LoopAnimation() {
  const calm = useReducedMotion();
  const [on, setOn] = useState(0);

  useEffect(() => {
    if (calm) return;
    const t = setInterval(() => setOn((x) => (x + 1) % steps.length), 2200);
    return () => clearInterval(t);
  }, [calm]);

  const R = 130;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-label="How NutriLens works: scan, score, store, use, shop" role="img">
      <div className="absolute inset-[12%] rounded-full border-2 border-dashed border-primary/25" aria-hidden="true" />
      {!calm && (
        <motion.div className="absolute inset-[12%] rounded-full" animate={{ rotate: 360 }} transition={{ duration: 11, repeat: Infinity, ease: "linear" }} aria-hidden="true">
          <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
        </motion.div>
      )}
      {steps.map((s, i) => {
        const a = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
        const active = i === on;
        return (
          <motion.div
            key={s.title}
            className="absolute top-1/2 left-1/2"
            style={{ x: `calc(${Math.cos(a) * R}px - 50%)`, y: `calc(${Math.sin(a) * R}px - 50%)` }}
            animate={{ scale: active && !calm ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className={cn("flex flex-col items-center gap-1 transition-colors", active ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("grid size-14 place-items-center rounded-2xl border bg-card shadow-sm transition-colors", active && "border-primary bg-primary text-primary-foreground shadow-lg")}>
                <s.icon className="size-6" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold">{s.title}</span>
            </div>
          </motion.div>
        );
      })}
      <div className="absolute inset-[30%] grid place-items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div key={on} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            <p className="font-display text-2xl font-semibold">
              {on + 1}. {steps[on].title}
            </p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{steps[on].body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
