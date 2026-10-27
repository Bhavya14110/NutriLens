import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
// AUTH DISABLED: the cookie-bound client is only needed when people sign in
// import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database, HouseholdRow, ProfileRow, Role } from "@/types/db";

export type Mate = Pick<ProfileRow, "user_id" | "name" | "allergens" | "diet" | "alcohol_ok"> & { role: Role };

export type Ctx = {
  // AUTH DISABLED: was the per-request cookie client (RLS applied). Now the service-role
  // client, so every route must keep filtering by household_id itself (they all do).
  // sb: Awaited<ReturnType<typeof supabaseServer>>;
  sb: SupabaseClient<Database>;
  uid: string;
  email: string;
  profile: ProfileRow | null;
  hh: HouseholdRow | null;
  mates: Mate[];
};

// AUTH DISABLED: with sign-in switched off everyone is this one guest user.
// Defaults to the seeded demo account so the app opens on real data.
const GUEST_EMAIL = (process.env.GUEST_EMAIL || "demo@nutrilens.app").toLowerCase();

let guest: Promise<{ id: string; email: string }> | null = null;

// look the guest up once per server process (create it on a fresh project)
function guestUser() {
  guest ??= (async () => {
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === GUEST_EMAIL);
    if (hit) return { id: hit.id, email: GUEST_EMAIL };
    const { data: made, error: e2 } = await admin.auth.admin.createUser({ email: GUEST_EMAIL, email_confirm: true, user_metadata: { full_name: "Guest" } });
    if (e2 || !made.user) throw e2 ?? new Error("couldn't create the guest user");
    return { id: made.user.id, email: GUEST_EMAIL };
  })().catch((err) => {
    // don't cache a failure, try again on the next request
    guest = null;
    throw err;
  });
  return guest;
}

// one lookup per request; react cache dedupes layout + page calls
export const getCtx = cache(async (): Promise<Ctx | null> => {
  // AUTH DISABLED: original signed-in lookup
  // const sb = await supabaseServer();
  // const { data: auth } = await sb.auth.getUser();
  // const user = auth.user;
  // if (!user) return null;
  const sb = supabaseAdmin();
  const user = await guestUser();

  const [{ data: profile }, { data: mem }] = await Promise.all([
    sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    // latest joined household wins if someone ends up in two
    sb.from("members").select("household_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
  ]);

  let hh: HouseholdRow | null = null;
  let mates: Mate[] = [];
  const hid = mem?.[0]?.household_id;
  if (hid) {
    const [{ data: house }, { data: rows }] = await Promise.all([
      sb.from("households").select("*").eq("id", hid).maybeSingle(),
      sb.from("members").select("user_id, role").eq("household_id", hid),
    ]);
    hh = house ?? null;
    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profs } = ids.length
      ? await sb.from("profiles").select("user_id, name, allergens, diet, alcohol_ok").in("user_id", ids)
      : { data: [] };
    mates = (rows ?? []).map((r) => {
      const p = profs?.find((x) => x.user_id === r.user_id);
      return {
        user_id: r.user_id,
        role: r.role,
        name: p?.name || "Housemate",
        allergens: p?.allergens ?? [],
        diet: p?.diet ?? "none",
        alcohol_ok: p?.alcohol_ok ?? false,
      };
    });
  }

  return { sb, uid: user.id, email: user.email ?? "", profile: profile ?? null, hh, mates };
});
