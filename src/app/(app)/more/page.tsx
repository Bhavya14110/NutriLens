import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/states";
import { SIDE } from "@/components/shell/nav";

export const metadata: Metadata = { title: "More" };

const blurbs: Record<string, string> = {
  "/drinks": "Mocktails from leftover juice, milk and fruit",
  "/shop": "Shared list with a ₹ cost estimate",
  "/insights": "Used vs wasted, Nutri-Score trends",
  "/settings": "Profile, household, notifications",
};

// mobile's fifth tab: everything that didn't fit in the bar
export default function MorePage() {
  const items = SIDE.filter((i) => blurbs[i.href]);
  return (
    <div>
      <PageHeader title="More" />
      <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex items-center gap-4 px-5 py-4 hover:bg-muted focus-visible:bg-muted">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <i.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.label}</span>
                <span className="block truncate text-sm text-muted-foreground">{blurbs[i.href]}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
