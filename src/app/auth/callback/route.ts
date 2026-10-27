import { NextResponse } from "next/server";
// AUTH DISABLED: OAuth / magic-link code exchange is off; restore the block below to bring it back.
// import { safeNext } from "@/lib/safe-next";
// import { supabaseServer } from "@/lib/supabase/server";
//
// // Google OAuth and the default magic-link template both land here with ?code=
// export async function GET(req: Request) {
//   const url = new URL(req.url);
//   const code = url.searchParams.get("code");
//   const next = safeNext(url.searchParams.get("next"));
//   if (code) {
//     const sb = await supabaseServer();
//     const { error } = await sb.auth.exchangeCodeForSession(code);
//     if (!error) return NextResponse.redirect(new URL(next, url.origin));
//   }
//   return NextResponse.redirect(new URL("/login?error=link", url.origin));
// }

export function GET(req: Request) {
  return NextResponse.redirect(new URL("/home", req.url));
}
