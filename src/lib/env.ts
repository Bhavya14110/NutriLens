import "server-only";
import { z } from "zod";

// read lazily so `next build` works without secrets and tests can stub process.env
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SPOONACULAR_KEY: z.string().default(""),
  SPOON_DAILY_POINTS: z.coerce.number().positive().default(45),
  MEALDB_KEY: z.string().default("1"),
  COCKTAILDB_KEY: z.string().default("1"),
  OFF_CONTACT_EMAIL: z.string().default("hello@nutrilens.app"),
  USD_INR_RATE: z.coerce.number().positive().default(84),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:hello@nutrilens.app"),
  CRON_SECRET: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const res = schema.safeParse(process.env);
  if (!res.success) {
    throw new Error(`Missing or bad env vars: ${res.error.issues.map((i) => i.path.join(".")).join(", ")}. See .env.example.`);
  }
  cached = res.data;
  return cached;
}

// the food APIs don't need supabase, so they read their bits without the strict check
export function apiEnv() {
  const e = process.env;
  return {
    spoonKey: e.SPOONACULAR_KEY ?? "",
    spoonDaily: Number(e.SPOON_DAILY_POINTS ?? 45) || 45,
    mealKey: e.MEALDB_KEY || "1",
    cocktailKey: e.COCKTAILDB_KEY || "1",
    offContact: e.OFF_CONTACT_EMAIL || "hello@nutrilens.app",
    usdInr: Number(e.USD_INR_RATE ?? 84) || 84,
  };
}
