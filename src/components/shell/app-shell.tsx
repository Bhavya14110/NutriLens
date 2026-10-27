"use client";

import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { isActive, SIDE, TABS } from "./nav";

function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

export function AppShell({ hh, children }: { hh: string; children: ReactNode }) {
  const path = usePathname();
  const online = useOnline();
  // scan is a full-bleed camera screen, no chrome around it on mobile
  const bare = path === "/scan";

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-6 md:flex" aria-label="Main">
        <Link href="/home" className="mb-1 px-2" aria-label="NutriLens home">
          <Logo />
        </Link>
        <p className="mb-6 truncate px-2 text-sm text-muted-foreground">{hh}</p>
        <nav className="flex flex-1 flex-col gap-1">
          {SIDE.map((item) => {
            const on = isActive(item, path);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  on ? "text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-xl bg-sidebar-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <item.icon className="relative size-[18px]" aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">Scan it, know it, use it up.</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!bare && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-2.5 backdrop-blur md:hidden">
            <Link href="/home" className="flex items-center gap-2" aria-label="NutriLens home">
              <LogoMark className="size-7" />
              <span className="max-w-[55vw] truncate font-display text-lg font-semibold">{hh}</span>
            </Link>
            <ThemeToggle />
          </header>
        )}

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning/30 px-4 py-1.5 text-xs font-medium text-foreground">
            <WifiOff className="size-3.5" aria-hidden="true" /> You&apos;re offline — showing your last saved pantry.
          </div>
        )}

        <main id="main" className={cn("flex-1", bare ? "" : "mx-auto w-full max-w-5xl px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12")}>
          {children}
        </main>

        <nav aria-label="Tabs" className={cn("pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/92 backdrop-blur md:hidden", bare && "hidden")}>
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {TABS.map((item) => {
              const on = isActive(item, path);
              const scan = item.href === "/scan";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", on ? "text-primary" : "text-muted-foreground")}
                  >
                    {scan ? (
                      <span className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                        <item.icon className="size-6" aria-hidden="true" />
                      </span>
                    ) : (
                      <item.icon className="size-5" aria-hidden="true" />
                    )}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
