"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";

// browser client is only used for auth; data goes through /api routes
export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
