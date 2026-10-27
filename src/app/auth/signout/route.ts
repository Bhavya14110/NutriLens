import { NextResponse } from "next/server";
// AUTH DISABLED: nothing to sign out of; restore the block below to bring it back.
// import { supabaseServer } from "@/lib/supabase/server";
//
// export async function POST(req: Request) {
//   const sb = await supabaseServer();
//   await sb.auth.signOut();
//   return NextResponse.redirect(new URL("/", req.url), { status: 303 });
// }

export function POST(req: Request) {
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
