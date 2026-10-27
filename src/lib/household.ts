import "server-only";
import { ApiError } from "@/lib/api";
import type { Ctx } from "@/lib/session";

// AUTH DISABLED: the create_household / join_household / leave_household RPCs read
// auth.uid(), which is empty without a signed-in session. These do the same work with
// the service-role client for the guest user. Swap back to ctx.sb.rpc(...) when auth returns.

export async function createHousehold(ctx: Ctx, name: string) {
  const { data, error } = await ctx.sb.from("households").insert({ name: name.trim() }).select("id").single();
  if (error) throw new ApiError(400, "Couldn't create the household. Try again.");
  const { error: e2 } = await ctx.sb.from("members").insert({ household_id: data.id, user_id: ctx.uid, role: "owner" });
  if (e2) throw new ApiError(400, "Couldn't create the household. Try again.");
  return data.id;
}

export async function joinHousehold(ctx: Ctx, code: string) {
  const { data: house } = await ctx.sb.from("households").select("id").eq("invite_code", code.trim().toLowerCase()).maybeSingle();
  if (!house) throw new ApiError(404, "That invite code doesn't match any household. Double-check it with whoever invited you.");
  const { error } = await ctx.sb.from("members").upsert({ household_id: house.id, user_id: ctx.uid, role: "member" }, { onConflict: "household_id,user_id", ignoreDuplicates: true });
  if (error) throw new ApiError(400, "Couldn't join that household. Try again.");
  return house.id;
}

// owner leaving hands the house to the oldest member, last one out deletes it
export async function leaveHousehold(ctx: Ctx, hid: string) {
  const { data: me } = await ctx.sb.from("members").select("role").eq("household_id", hid).eq("user_id", ctx.uid).maybeSingle();
  if (!me) throw new ApiError(400, "You're not in that household.");
  await ctx.sb.from("members").delete().eq("household_id", hid).eq("user_id", ctx.uid);
  const { data: next } = await ctx.sb.from("members").select("user_id").eq("household_id", hid).order("created_at").limit(1);
  if (!next?.length) await ctx.sb.from("households").delete().eq("id", hid);
  else if (me.role === "owner") await ctx.sb.from("members").update({ role: "owner" }).eq("household_id", hid).eq("user_id", next[0].user_id);
}

export async function previewHousehold(ctx: Ctx, code: string) {
  const { data: house } = await ctx.sb.from("households").select("id, name").eq("invite_code", code).maybeSingle();
  if (!house) return null;
  const { count } = await ctx.sb.from("members").select("user_id", { count: "exact", head: true }).eq("household_id", house.id);
  return { name: house.name, member_count: count ?? 0 };
}
