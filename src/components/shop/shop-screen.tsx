"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Loader2, Plus, ScanLine, ShoppingBasket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Empty, ErrorBox, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { qk, useAddShop, useRemoveShop, useShop, useTickShop } from "@/hooks/data";
import { api } from "@/lib/fetcher";
import { formatInr } from "@/lib/shop";
import { cn } from "@/lib/utils";
import type { CostRes, ShopItemView } from "@/types/api";

export function ShopScreen() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useShop();
  const add = useAddShop();
  const [name, setName] = useState("");
  const [src, setSrc] = useState<CostRes["priced"] | null>(null);

  const cost = useMutation({
    mutationFn: () => api<CostRes>("/api/shop/cost", { method: "POST" }),
    onSuccess: (r) => {
      setSrc(r.priced);
      void qc.invalidateQueries({ queryKey: qk.shop });
    },
    onError: (e) => toast.error(e.message),
  });

  const todo = data?.items.filter((i) => !i.done) ?? [];
  const done = data?.items.filter((i) => i.done) ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    add.mutate([{ name: n }], { onSuccess: () => setName("") });
  }

  return (
    <div>
      <PageHeader
        title="Shopping list"
        sub="Shared with your household. Scanning something on the list ticks it off."
        action={
          <Button asChild variant="outline">
            <Link href="/scan">
              <ScanLine aria-hidden="true" /> Scan while shopping
            </Link>
          </Button>
        }
      />

      <form onSubmit={submit} className="mb-5 flex gap-2">
        <Label htmlFor="shop-add" className="sr-only">
          Add an item
        </Label>
        <Input id="shop-add" placeholder="Add milk, onions, atta…" value={name} onChange={(e) => setName(e.target.value)} className="h-11" maxLength={120} />
        <Button type="submit" className="h-11" disabled={!name.trim() || add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />} Add
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorBox error={error} retry={() => refetch()} />
      ) : !data?.items.length ? (
        <Empty icon={ShoppingBasket} title="Your list is empty" body="Add things above, or tap “Add missing” on any recipe to fill it in one go." cta={{ href: "/recipes", label: "Find a recipe" }} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-accent p-5 text-accent-foreground">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Estimated total</p>
              <p className="font-display text-4xl font-semibold tabular-nums">{data.priced === "none" ? "—" : formatInr(data.total)}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {data.priced === "none"
                  ? `${todo.length} item${todo.length === 1 ? "" : "s"} to buy · tap estimate for a rough cost`
                  : `Estimate for ${todo.length} item${todo.length === 1 ? "" : "s"}${src === "local" ? " · typical Indian prices" : src === "spoon" ? " · via Spoonacular, converted to ₹" : ""}. Actual prices vary.`}
              </p>
            </div>
            <Button variant="secondary" onClick={() => cost.mutate()} disabled={cost.isPending || !todo.length}>
              {cost.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Calculator aria-hidden="true" />}
              {data.priced === "none" ? "Estimate cost" : "Re-estimate"}
            </Button>
          </div>

          <section aria-labelledby="todo">
            <h2 id="todo" className="sr-only">
              To buy
            </h2>
            {todo.length ? (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {todo.map((i) => (
                    <ShopRow key={i.id} item={i} />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">All bought. Nice one!</p>
            )}
          </section>

          {done.length > 0 && (
            <section aria-labelledby="done">
              <h2 id="done" className="mb-2 text-sm font-semibold text-muted-foreground">
                In the basket ({done.length})
              </h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {done.map((i) => (
                    <ShopRow key={i.id} item={i} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ShopRow({ item }: { item: ShopItemView }) {
  const tick = useTickShop();
  const remove = useRemoveShop();
  const id = `shop-${item.id}`;
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
      <Checkbox
        id={id}
        checked={item.done}
        className="size-5"
        onCheckedChange={(v) =>
          tick.mutate(
            { ids: item.ids, done: Boolean(v) },
            { onSuccess: (r) => v && r.added && toast.success(`${item.name} moved to your pantry`) },
          )
        }
      />
      <label htmlFor={id} className={cn("min-w-0 flex-1 cursor-pointer", item.done && "text-muted-foreground line-through")}>
        <span className="block truncate font-medium capitalize">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          {item.qty} {item.unit}
          {item.ids.length > 1 && ` · merged ${item.ids.length} entries`}
        </span>
      </label>
      {item.est_cost_inr !== null && !item.done && <span className="text-sm text-muted-foreground tabular-nums">~{formatInr(item.est_cost_inr)}</span>}
      <button type="button" onClick={() => remove.mutate(item.ids)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Remove ${item.name} from the list`}>
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </motion.li>
  );
}
