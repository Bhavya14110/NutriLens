"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MoreHorizontal, Pencil, Plus, Refrigerator, Snowflake, Trash2, Warehouse, PieChart } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExpiryChip, NutriScore } from "@/components/common/badges";
import { FoodImage } from "@/components/common/food-image";
import { Empty, ErrorBox, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePantry, usePatchPantry } from "@/hooks/data";
import { freshness, type Fresh } from "@/lib/expiry";
import { cn } from "@/lib/utils";
import type { PantryView } from "@/types/api";
import type { Loc } from "@/types/db";
import { AddToPantrySheet } from "./add-sheet";
import { EditDialog, PartUseDialog } from "./item-dialogs";

const groups: { loc: Loc; label: string; icon: typeof Refrigerator }[] = [
  { loc: "fridge", label: "Fridge", icon: Refrigerator },
  { loc: "freezer", label: "Freezer", icon: Snowflake },
  { loc: "shelf", label: "Shelf", icon: Warehouse },
];

type Filter = "all" | "soon" | "expired" | Loc;
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "soon", label: "Use soon" },
  { id: "expired", label: "Expired" },
  { id: "fridge", label: "Fridge" },
  { id: "freezer", label: "Freezer" },
  { id: "shelf", label: "Shelf" },
];

const edge: Record<Fresh, string> = { expired: "before:bg-expired", soon: "before:bg-soon", fresh: "before:bg-fresh", none: "before:bg-border" };

export function PantryScreen() {
  const { data, isLoading, error, refetch, isFetching } = usePantry();
  // Home's "Use these first" cards link here with ?filter=soon
  const sp = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => (filters.some((f) => f.id === sp.get("filter")) ? (sp.get("filter") as Filter) : "all"));

  const shown = useMemo(() => {
    const items = data ?? [];
    if (filter === "soon") return items.filter((i) => freshness(i.expires_at) === "soon");
    if (filter === "expired") return items.filter((i) => freshness(i.expires_at) === "expired");
    if (filter === "all") return items;
    return items.filter((i) => i.location === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const items = data ?? [];
    return { soon: items.filter((i) => freshness(i.expires_at) === "soon").length, expired: items.filter((i) => freshness(i.expires_at) === "expired").length };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Pantry"
        sub={data ? `${data.length} item${data.length === 1 ? "" : "s"}${counts.soon ? ` · ${counts.soon} to use soon` : ""}${counts.expired ? ` · ${counts.expired} expired` : ""}` : "Everything in your kitchen"}
        action={
          <AddToPantrySheet
            seed={{ name: "", canon: null, askCanon: true }}
            trigger={
              <Button>
                <Plus aria-hidden="true" /> Add item
              </Button>
            }
          />
        }
      />

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label="Filter pantry">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", filter === f.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {f.label}
            {f.id === "soon" && counts.soon > 0 && <span className="ml-1.5 rounded-full bg-soon/25 px-1.5 text-xs">{counts.soon}</span>}
            {f.id === "expired" && counts.expired > 0 && <span className="ml-1.5 rounded-full bg-expired/20 px-1.5 text-xs">{counts.expired}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorBox error={error} retry={() => refetch()} />
      ) : !data?.length ? (
        <Empty icon={Refrigerator} title="Your pantry is empty" body="Scan a pack or add fresh fruit to start tracking what's in your kitchen." cta={{ href: "/scan", label: "Scan your first item" }} />
      ) : !shown.length ? (
        <Empty icon={CheckCircle2} title="Nothing here" body={filter === "expired" ? "Nothing has expired. Lovely." : filter === "soon" ? "Nothing needs using up in the next 3 days." : "No items in this spot yet."} />
      ) : (
        <div className={cn("space-y-7 transition-opacity", isFetching && "opacity-90")}>
          {groups.map((g) => {
            const items = shown.filter((i) => i.location === g.loc);
            if (!items.length) return null;
            return (
              <section key={g.loc} aria-labelledby={`grp-${g.loc}`}>
                <h2 id={`grp-${g.loc}`} className="mb-2.5 flex items-center gap-2 text-lg font-semibold">
                  <g.icon className="size-4 text-primary" aria-hidden="true" /> {g.label}
                  <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((it) => (
                      <PantryRowItem key={it.id} item={it} />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PantryRowItem({ item }: { item: PantryView }) {
  const patch = usePatchPantry();
  const [part, setPart] = useState(false);
  const [edit, setEdit] = useState(false);
  const f = freshness(item.expires_at);

  const close = (status: "used" | "wasted") =>
    patch.mutate(
      { id: item.id, patch: { status } },
      {
        onSuccess: () =>
          toast(status === "used" ? `Used up ${item.name} 🎉` : `${item.name} marked as wasted`, {
            action: { label: "Undo", onClick: () => patch.mutate({ id: item.id, patch: { status: "active" } }) },
          }),
      },
    );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3 pl-4 before:absolute before:inset-y-0 before:left-0 before:w-1.5", edge[f])}
    >
      <FoodImage src={item.image} alt="" kind={item.fruit ? "fruit" : "product"} className="size-12 shrink-0 rounded-xl" sizes="48px" contain={Boolean(item.image)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{item.name}</p>
          <NutriScore grade={item.grade} size="sm" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ExpiryChip date={item.expires_at} />
          <span>
            {item.qty} {item.unit}
          </span>
        </div>
      </div>
      {/* one quiet tick per row instead of a "Used" label repeated down the list */}
      <Button variant="ghost" size="icon" onClick={() => close("used")} aria-label={`Mark ${item.name} as used`} title="Mark as used" className="text-fresh hover:bg-fresh/10 hover:text-fresh">
        <CheckCircle2 className="size-5" aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${item.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setPart(true)}>
            <PieChart aria-hidden="true" /> Partly used…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Pencil aria-hidden="true" /> Edit expiry & amount
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => close("wasted")}>
            <Trash2 aria-hidden="true" /> Wasted
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {part && <PartUseDialog item={item} open={part} onOpenChange={setPart} />}
      {edit && <EditDialog item={item} open={edit} onOpenChange={setEdit} />}
    </motion.li>
  );
}
