import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/db";
import { env } from "@/lib/env";

// per-request client bound to the user's cookies, so RLS applies
export async function supabaseServer() {
  const jar = await cookies();
  const e = env();
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // called from a server component, the proxy refreshes the session anyway
        }
      },
    },
  });
}

let admin: ReturnType<typeof createClient<Database>> | null = null;

// service role: bypasses RLS. only for products, api_cache, quota_log and cron.
export function supabaseAdmin() {
  if (admin) return admin;
  const e = env();
  admin = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
