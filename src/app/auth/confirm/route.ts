import { NextResponse } from "next/server";
// AUTH DISABLED: token_hash magic-link verification is off; restore the block below to bring it back.
// import type { EmailOtpType } from "@supabase/supabase-js";
// import { safeNext } from "@/lib/safe-next";
// import { supabaseServer } from "@/lib/supabase/server";
//
// const types: EmailOtpType[] = ["magiclink", "email", "signup", "invite", "recovery", "email_change"];
//
// // token_hash flow: works even if the link is opened in a different browser than the one that asked
// export async function GET(req: Request) {
//   const url = new URL(req.url);
//   const hash = url.searchParams.get("token_hash");
//   const type = url.searchParams.get("type") as EmailOtpType | null;
//   const next = safeNext(url.searchParams.get("next"));
//   if (hash && type && types.includes(type)) {
//     const sb = await supabaseServer();
//     const { error } = await sb.auth.verifyOtp({ token_hash: hash, type });
//     if (!error) return NextResponse.redirect(new URL(next, url.origin));
//   }
//   return NextResponse.redirect(new URL("/login?error=link", url.origin));
// }

export function GET(req: Request) {
  return NextResponse.redirect(new URL("/home", req.url));
}
