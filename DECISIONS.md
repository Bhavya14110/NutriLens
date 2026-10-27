# Decisions

One line per call I had to make, with the reason. Newest at the bottom.

- **Next.js 16.4 with `cacheComponents: false`** — every screen is per-household and auth-gated, so prerendered shells buy little; classic dynamic rendering keeps the code simpler.
- **`middleware.ts` → `src/proxy.ts`** — Next 16 renamed the convention; the proxy refreshes the Supabase session and gates app routes.
- **Typecheck runs `next typegen` first** — `PageProps`/`RouteContext` route types are generated, so `tsc` needs them on a clean checkout.
- **TypeScript 5 (not 7)** — create-next-app pinned `typescript@^5`, which the Next plugin supports.
- **shadcn/ui "radix-nova" preset** — the current shadcn CLI default; it uses the `radix-ui` package and the `cn` package (shadcn's own clsx + tailwind-merge).
- **Fonts: Fraunces (display, soft serif) + Plus Jakarta Sans (body)** — warm and food-friendly, both via `next/font`.
- **Hand-written `public/sw.js` instead of Serwist** — Next 16 builds with Turbopack and Serwist's Next plugin is webpack-based; the Next PWA guide itself uses a hand-written worker. It does app-shell caching, an offline page and push.
- **Offline pantry = TanStack Query persisted to localStorage** (per-user key, 7 days) with `networkMode: "offlineFirst"` — the service worker never caches `/api/*`, so one person's data is never served to another on a shared phone.
- **Browser Supabase client is used for auth only** — all data goes through our `/api` routes with the cookie-bound server client, so RLS still applies and there's one data path.
- **Added `profiles.onboarded`** (not in the spec) — tells "signed in but hasn't finished onboarding" apart from "done".
- **Household creation/joining/leaving via `security definer` RPCs** (`create_household`, `join_household`, `leave_household`, `household_preview`) — inserts into `members` can't be expressed safely as RLS policies.
- **Active household = most recently joined** — users normally have one; joining via invite switches you over (the join page says so).
- **Invite codes are 8 hex chars** — easy to read out loud, ~4 billion combinations, unique-indexed.
- **IST for every "today"** — expiry, insights months and the 9am cron use a fixed +05:30 offset (India has no DST).
- **"Saved from expiry" = used on or before its date, within its last 3 days** — matches the "use soon" window.
- **OFF swaps use Search-a-licious (`search.openfoodfacts.org`)** — during the docs check the classic `/api/v2/search` and `/cgi/search.pl` returned "Page temporarily unavailable" HTML; v2 search is kept as a fallback. Docs win over the prompt here.
- **OFF HTML maintenance pages are treated as retryable 503s** — they come back with status 200, so we check the content-type.
- **Fruityvice 404 `{"error":"Not found"}` → `null`, then a fuzzy match against the cached list** — its names are picky ("GreenApple", "Kiwifruit").
- **Spoonacular auth via the `x-api-key` header**, as the spec asked.
- **Spoonacular `findByIngredients` has no diet/intolerance params** (confirmed in docs) — we filter results ourselves with keyword lists in `src/lib/diet.ts`; a recipe must pass every diet in the household.
- **Quota costs: `parseIngredients` is 1 point per ingredient line** (docs), not per request; we also read the real cost from the `X-API-Quota-Request` header.
- **Quota day = UTC date** — Spoonacular resets its points at UTC midnight.
- **Shopping cost fallback: a small table of typical Indian prices** (`src/lib/shop.ts`) — the list always shows a ₹ estimate even without Spoonacular or once the budget is spent; it's labelled as an estimate either way.
- **TheCocktailDB's free key returns only ~1 drink per `filter.php?i=`** (found during the docs check). Drinks therefore pull the whole non-alcoholic list (58 drinks) once a week, look each up (cached), and match pantry leftovers locally; `filter.php?i=` still runs per leftover for variety and for alcoholic drinks when allowed.
- **TheCocktailDB empty results are `{"drinks":"no data found"}`** — parsed as an empty list.
- **TheMealDB `filter.php?a=Indian` currently returns `{"meals": null}` on the free key** — handled as an empty state; categories (e.g. Vegetarian) are the default Explore view instead.
- **Alcohol only when every member has `alcohol_ok`** — the drink detail route also refuses alcoholic drinks otherwise.
- **Canon resolver: longest keyword wins; brand-only keywords that span product types were removed** (e.g. "Kissan" made "Kissan Mixed Fruit Jam" resolve to ketchup).
- **Cook mode "partly used" = half by default** — quick to tap mid-cooking; the pantry screen has an exact "Partly used…" dialog.
- **Scan tab sits in the middle of the bottom bar** (Home, Pantry, Scan, Recipes, More) — same five tabs as the spec, with Scan as the thumb-reach centre button.
- **Product name → "Counts as" picker on the Health Score card** — corrections are saved to `products.canon_ing` for everyone, as the spec's resolver order needs.
- **Magic links: `/auth/callback` (PKCE `?code=`) and `/auth/confirm` (`token_hash`)** — the default email template works; the README shows the `token_hash` template for links opened in a different browser. Playwright signs in through `/auth/confirm` with an admin-generated link — the real flow, no backdoor.
- **RLS test**: always checks the migration statically; also runs a live two-user test when `RLS_TEST_*` env vars point at a real project.
- **Seed is `scripts/seed.ts` (not `seed.sql`)** — it has to create auth users, which needs the admin API; it uses real OFF barcodes.
- **Images through `next/image`** with remote patterns for the API image hosts; a calm icon tile replaces any broken image.
