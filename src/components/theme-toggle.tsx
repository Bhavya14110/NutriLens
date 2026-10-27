"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const order = ["system", "light", "dark"] as const;
const icons = { system: Monitor, light: Sun, dark: Moon };

// avoids a hydration mismatch: theme is only known on the client
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const cur = (mounted && order.includes(theme as (typeof order)[number]) ? theme : "system") as (typeof order)[number];
  const next = order[(order.indexOf(cur) + 1) % order.length];
  const Icon = icons[cur];
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`Theme: ${cur}. Switch to ${next}`} title={`Theme: ${cur}`}>
      <Icon className="size-4" />
    </Button>
  );
}
