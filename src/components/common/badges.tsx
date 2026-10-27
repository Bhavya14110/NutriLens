import { daysLeft, expiryText, freshness, type Fresh } from "@/lib/expiry";
import { GRADE_COLORS, NOVA_COLORS, NOVA_TEXT } from "@/lib/health";
import { cn } from "@/lib/utils";
import type { Grade } from "@/types/food";

const darkText = new Set(["c"]);

// official Nutri-Score look: the active letter pops, the others sit dimmed beside it
export function NutriScore({ grade, size = "lg" }: { grade: Grade | null; size?: "sm" | "lg" }) {
  const letters = ["a", "b", "c", "d", "e"] as const;
  if (size === "sm") {
    if (!grade) return null;
    return (
      <span
        className="inline-grid size-6 place-items-center rounded-md text-xs font-bold uppercase"
        style={{ background: GRADE_COLORS[grade], color: darkText.has(grade) ? "#1a1a1a" : "#fff" }}
        aria-label={`Nutri-Score ${grade.toUpperCase()}`}
        title={`Nutri-Score ${grade.toUpperCase()}`}
      >
        {grade}
      </span>
    );
  }
  return (
    <div className="inline-flex flex-col items-center" role="img" aria-label={grade ? `Nutri-Score ${grade.toUpperCase()}` : "Nutri-Score not available"}>
      <span className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Nutri-Score</span>
      <div className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
        {letters.map((l) => {
          const on = l === grade;
          return (
            <span
              key={l}
              className={cn("grid place-items-center font-bold uppercase transition-all", on ? "z-10 -my-2 size-12 rounded-xl text-2xl shadow-md" : "size-8 text-sm opacity-45 first:rounded-l-lg last:rounded-r-lg")}
              style={{ background: GRADE_COLORS[l], color: darkText.has(l) ? "#1a1a1a" : "#fff" }}
            >
              {l}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function NovaBadge({ nova }: { nova: 1 | 2 | 3 | 4 | null }) {
  return (
    <div className="inline-flex flex-col items-center" role="img" aria-label={nova ? `NOVA group ${nova}: ${NOVA_TEXT[nova]}` : "NOVA group not available"}>
      <span className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">NOVA</span>
      <span
        className="grid size-12 place-items-center rounded-xl font-display text-2xl font-bold text-white shadow-md"
        style={{ background: nova ? NOVA_COLORS[nova] : "var(--muted-foreground)" }}
      >
        {nova ?? "?"}
      </span>
    </div>
  );
}

const freshCls: Record<Fresh, string> = {
  expired: "bg-expired/12 text-expired ring-expired/30",
  soon: "bg-soon/15 text-[color-mix(in_oklch,var(--soon),black_35%)] ring-soon/40 dark:text-soon",
  fresh: "bg-fresh/12 text-fresh ring-fresh/30",
  none: "bg-muted text-muted-foreground ring-border",
};

export function ExpiryChip({ date, className }: { date: string | null; className?: string }) {
  const f = freshness(date);
  const d = daysLeft(date);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", freshCls[f], className)} title={date ?? undefined}>
      <span className={cn("size-1.5 rounded-full", f === "expired" ? "bg-expired" : f === "soon" ? "bg-soon" : f === "fresh" ? "bg-fresh" : "bg-muted-foreground")} aria-hidden="true" />
      {d !== null && d >= 0 && d <= 1 ? expiryText(date) : expiryText(date).replace("Good till ", "")}
    </span>
  );
}
