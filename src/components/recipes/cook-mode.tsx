"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Leaf, Loader2, PartyPopper, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExpiryChip } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { RecipeIng } from "@/types/api";
import type { Recipe } from "@/types/food";

type Pick = { id: string; mode: "all" | "part" };

export function CookMode({ src, recipe, ings, onClose }: { src: "spoon" | "mealdb"; recipe: Recipe; ings: RecipeIng[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"steps" | "pick" | "done">("steps");
  const [saved, setSaved] = useState(0);
  const total = recipe.steps.length;

  // lock page scroll + esc to leave, it's a full-screen takeover
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (phase !== "steps") return;
      if (e.key === "ArrowRight") setStep((s) => Math.min(total - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose, phase, total]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Cook mode: ${recipe.title}`} className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Leave cook mode">
          <X aria-hidden="true" />
        </Button>
        <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{recipe.title}</p>
        {phase === "steps" && (
          <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {step + 1} / {total}
          </span>
        )}
      </header>
      {phase === "steps" && (
        <div className="h-1 bg-muted">
          <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {phase === "steps" && (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-6">
            {recipe.youtube && step === 0 && (
              <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${recipe.youtube}`}
                  title={`Video: ${recipe.title}`}
                  className="size-full"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="font-display text-2xl leading-snug md:text-4xl md:leading-snug"
              >
                {recipe.steps[step]}
              </motion.p>
            </AnimatePresence>
            {recipe.youtube && step > 0 && (
              <a href={`https://www.youtube.com/watch?v=${recipe.youtube}`} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground underline">
                Watch the video on YouTube
              </a>
            )}
          </div>
        )}
        {phase === "pick" && (
          <PickUsed
            src={src}
            recipe={recipe}
            ings={ings}
            onDone={(n) => {
              setSaved(n);
              setPhase("done");
            }}
          />
        )}
        {phase === "done" && <Saved saved={saved} onClose={onClose} />}
      </div>

      {phase === "steps" && (
        <footer className="pb-safe flex gap-3 border-t p-4">
          <Button variant="outline" className="h-14 flex-1 text-base" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
          {step < total - 1 ? (
            <Button className="h-14 flex-[2] text-base" onClick={() => setStep((s) => s + 1)}>
              Next step <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button className="h-14 flex-[2] text-base" onClick={() => setPhase("pick")}>
              <PartyPopper aria-hidden="true" /> I cooked this
            </Button>
          )}
        </footer>
      )}
    </div>
  );
}

function PickUsed({ src, recipe, ings, onDone }: { src: "spoon" | "mealdb"; recipe: Recipe; ings: RecipeIng[]; onDone: (saved: number) => void }) {
  const qc = useQueryClient();
  // every pantry item that matched an ingredient, pre-ticked
  const options = useMemo(() => {
    const seen = new Set<string>();
    return ings.flatMap((i) => i.items.filter((p) => !seen.has(p.id) && seen.add(p.id)).map((p) => ({ ...p, ing: i.name })));
  }, [ings]);
  const [picks, setPicks] = useState<Record<string, Pick["mode"] | null>>(() => Object.fromEntries(options.map((o) => [o.id, "all"])));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const used = Object.entries(picks)
      .filter((e): e is [string, Pick["mode"]] => e[1] !== null)
      .map(([id, mode]) => ({ id, mode }));
    try {
      const res = await api<{ used: number; saved: number }>("/api/cook", { method: "POST", json: { src, recipe_id: recipe.id, title: recipe.title, used } });
      await Promise.all(["pantry", "home", "useitup", "drinks", "insights"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      onDone(res.saved);
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h2 className="text-2xl font-semibold">What did you use?</h2>
      <p className="mt-1 text-sm text-muted-foreground">We&apos;ll take these out of your pantry. Untick anything you didn&apos;t touch.</p>
      {options.length ? (
        <ul className="mt-5 space-y-2">
          {options.map((o) => {
            const mode = picks[o.id];
            return (
              <li key={o.id} className={cn("rounded-2xl border p-3 transition-colors", mode && "border-primary/40 bg-primary/5")}>
                <div className="flex items-center gap-3">
                  <Checkbox id={`pk-${o.id}`} checked={mode !== null} onCheckedChange={(v) => setPicks((p) => ({ ...p, [o.id]: v ? "all" : null }))} />
                  <label htmlFor={`pk-${o.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block truncate font-medium">{o.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {o.qty} {o.unit} · for {o.ing} <ExpiryChip date={o.expires_at} />
                    </span>
                  </label>
                </div>
                {mode && (
                  <div className="mt-2 ml-7 flex gap-2" role="radiogroup" aria-label={`How much ${o.name}`}>
                    {(["all", "part"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={mode === m}
                        onClick={() => setPicks((p) => ({ ...p, [o.id]: m }))}
                        className={cn("rounded-full border px-3 py-1 text-xs font-medium", mode === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                      >
                        {m === "all" ? "Used it all" : "Used about half"}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">None of the ingredients matched your pantry, so there&apos;s nothing to take out. We&apos;ll still log the meal.</p>
      )}
      <Button className="mt-6 h-12 w-full text-base" onClick={save} disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Update pantry
      </Button>
    </div>
  );
}

// the "saved from waste" moment: leaves burst out of a ring, count pops in
function Saved({ saved, onClose }: { saved: number; onClose: () => void }) {
  const router = useRouter();
  const calm = useReducedMotion();
  const leaves = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center" role="status">
      <div className="relative grid size-40 place-items-center">
        {!calm &&
          leaves.map((i) => {
            const a = (i / leaves.length) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute text-primary"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ x: Math.cos(a) * 90, y: Math.sin(a) * 90, opacity: [0, 1, 0], scale: 1, rotate: 180 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                aria-hidden="true"
              >
                <Leaf className="size-5" />
              </motion.span>
            );
          })}
        <motion.span
          className="grid size-32 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          <span className="font-display text-5xl font-semibold">{saved}</span>
        </motion.span>
      </div>
      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 text-3xl font-semibold">
        {saved > 0 ? `Saved from waste!` : "Nicely done!"}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-2 max-w-xs text-muted-foreground">
        {saved > 0 ? `You rescued ${saved} item${saved === 1 ? "" : "s"} that ${saved === 1 ? "was" : "were"} about to expire. Your pantry is updated.` : "Your pantry is updated and the meal is logged."}
      </motion.p>
      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Back to recipe
        </Button>
        <Button onClick={() => router.push("/home")}>Go home</Button>
      </div>
    </div>
  );
}
