// Local-only sign-in: prints a one-time magic link without sending an email, handy when
// Supabase's built-in mailer is rate limited (2 emails/hour). Needs the service role key,
// so it can only ever run on a machine that already has full access.
// Usage: npm run dev:login -- you@example.com
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const app = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

if (!email || !email.includes("@")) {
  console.error("Usage: npm run dev:login -- you@example.com");
  process.exit(1);
}
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

async function main() {
  const sb = createClient(url as string, key as string, { auth: { persistSession: false } });
  // magiclink creates the account too if it doesn't exist yet
  const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email: email as string });
  if (error || !data.properties?.hashed_token) throw error ?? new Error("no token returned");
  console.log(`\nOpen this in the browser running the app (valid for about an hour, one use):\n`);
  console.log(`${app}/auth/confirm?token_hash=${data.properties.hashed_token}&type=email&next=/home\n`);
}

main().catch((e) => {
  console.error("Couldn't make a link:", e instanceof Error ? e.message : e);
  process.exit(1);
});
