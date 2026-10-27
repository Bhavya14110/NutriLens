import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { HouseholdRow, ProfileRow, Role } from "@/types/db";

export type Mate = Pick<ProfileRow, "user_id" | "name" | "allergens" | "diet" | "alcohol_ok"> & { role: Role };

export type Ctx = {
  sb: Awaited<ReturnType<typeof supabaseServer>>;
  uid: string;
  email: string;
  profile: ProfileRow | null;
  hh: HouseholdRow | null;
  mates: Mate[];
};

// one lookup per request; react cache dedupes layout + page calls
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return null;

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
