import { needHh, ok, route } from "@/lib/api";
import { houseDiets } from "@/lib/diet";
import { daysLeft } from "@/lib/expiry";
import { activeItems } from "@/lib/pantry";
import { useItUp } from "@/lib/useitup";
import type { UseItUpRes } from "@/types/api";

export const GET = route(async () => {
  const ctx = await needHh();
  const items = await activeItems(ctx);
  // only things still worth cooking - skip what's already gone off
  const usable = items.filter((i) => (daysLeft(i.expires_at) ?? 0) >= 0);
  const res: UseItUpRes = await useItUp(usable, houseDiets(ctx.mates.map((m) => m.diet)));
  return ok(res);
});
