import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// pages that need a session; everything else (landing, login, api, assets) passes through
const gated = ["/home", "/scan", "/product", "/fruit", "/pantry", "/recipes", "/drinks", "/shop", "/insights", "/settings", "/onboarding", "/more"];

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;

  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });

  // getClaims verifies the jwt and refreshes it if needed, keep it right here
  const { data } = await sb.auth.getClaims();
  const signedin = Boolean(data?.claims?.sub);
  const path = req.nextUrl.pathname;

  if (!signedin && gated.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (signedin && (path === "/login" || path === "/")) {
    const to = req.nextUrl.clone();
    to.pathname = "/home";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|sw.js|manifest.webmanifest|icons|offline|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
