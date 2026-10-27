"use client";

import { AlertTriangle, RotateCw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  icon: Icon,
  title,
  body,
  cta,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: { href?: string; label: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta &&
        (cta.href ? (
          <Button asChild className="mt-5">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button className="mt-5" onClick={cta.onClick}>
            {cta.label}
          </Button>
        ))}
    </div>
  );
}

export function ErrorBox({ error, retry, className }: { error: unknown; retry?: () => void; className?: string }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center", className)}>
      <AlertTriangle className="size-7 text-destructive" aria-hidden="true" />
      <p className="max-w-sm text-sm">{msg}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          <RotateCw aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}
