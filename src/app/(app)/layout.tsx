import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/query-provider";
import { AppShell } from "@/components/shell/app-shell";
import { getCtx } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (!ctx.hh || !ctx.profile?.onboarded) redirect("/onboarding");

  return (
    <QueryProvider uid={ctx.uid}>
      <AppShell hh={ctx.hh.name}>{children}</AppShell>
    </QueryProvider>
  );
}
