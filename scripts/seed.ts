// Seeds a demo household so the app never starts empty. Safe to re-run: it wipes and rebuilds
// the demo + e2e households. Run with: npm run seed   (needs .env.local with the service role key)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, Loc } from "../src/types/db";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const sb = createClient<Database>(url, key, { auth: { persistSession: false } });

export const DEMO = { email: "demo@nutrilens.app", code: "de30f1a7", house: "Demo Flat 4B" };
export const MATE = { email: "asha@nutrilens.app" };
export const E2E = { email: "e2e@nutrilens.app", code: "e2e0c0de", house: "E2E Kitchen" };
const OTHER = { email: "neighbour@nutrilens.app", code: "0bad0bad", house: "Next Door" };

// IST calendar maths, same as the app
const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const day = (n: number) => {
  const d = new Date(`${istToday()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const at = (n: number, hour = 13) => `${day(n)}T${String(hour).padStart(2, "0")}:00:00+05:30`;

async function user(email: string, name: string) {
  // listUsers is paginated; the demo project is tiny so page 1 is enough
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let u = list.users.find((x) => x.email === email);
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !data.user) throw error ?? new Error(`couldn't create ${email}`);
    u = data.user;
  }
  return u.id;
}

async function house(code: string, name: string, owners: { id: string; role: "owner" | "member" }[]) {
  await sb.from("households").delete().eq("invite_code", code);
  const { data, error } = await sb.from("households").insert({ name, invite_code: code }).select("id").single();
  if (error) throw error;
  for (const o of owners) {
    // a seeded user should only belong to this one house
    await sb.from("members").delete().eq("user_id", o.id);
    const { error: e } = await sb.from("members").insert({ household_id: data.id, user_id: o.id, role: o.role });
    if (e) throw e;
  }
  return data.id;
}

// real Open Food Facts barcodes; the app refreshes them live when opened
const products: Database["public"]["Tables"]["products"]["Insert"][] = [
  { barcode: "8902579000370", name: "Frooti mango drink", brand: "Parle Agro", nutriscore: "e", nova: 4, categories: ["en:beverages", "en:sweetened-beverages", "en:fruit-based-beverages"], canon_ing: "mango juice" },
  { barcode: "8901764092206", name: "Maaza Original 600ml", brand: "Maaza", nutriscore: "e", nova: 4, categories: ["en:beverages", "en:sweetened-beverages"], canon_ing: "mango juice" },
  { barcode: "8901719125478", name: "Parle-G Gold 75g", brand: "Parle", nutriscore: "d", nova: 4, categories: ["en:snacks", "en:biscuits"], canon_ing: "biscuits" },
  { barcode: "8901030922787", name: "Mixed Fruit Jam", brand: "Kissan", nutriscore: "d", nova: 4, categories: ["en:spreads", "en:jams", "en:mixed-fruit-jams"], canon_ing: "jam" },
  { barcode: "8901491103800", name: "Oats", brand: "Quaker", nutriscore: "a", nova: 1, categories: ["en:cereals-and-potatoes", "en:rolled-oats"], canon_ing: "oats" },
  { barcode: "8901499010216", name: "Corn Flakes", brand: "Kellogg's", nutriscore: "c", nova: 3, categories: ["en:breakfast-cereals", "en:corn-flakes"], canon_ing: "cornflakes" },
  { barcode: "8901233030548", name: "Cadbury Dairy Milk", brand: "Mondelez", nutriscore: "e", nova: 4, categories: ["en:chocolates", "en:milk-chocolates"], canon_ing: "chocolate" },
  { barcode: "8901047816208", name: "Dal makhani", brand: "Kohinoor", nutriscore: "a", nova: 3, categories: ["en:meals", "en:dals"], canon_ing: "lentils" },
  { barcode: "3017624010701", name: "Nutella", brand: "Ferrero", nutriscore: "e", nova: 4, allergens: ["en:milk", "en:nuts", "en:soybeans"], categories: ["en:spreads", "en:hazelnut-spreads"], canon_ing: "chocolate spread" },
  { barcode: "3502110009449", name: "Tropicana Orange Juice", brand: "Tropicana", nutriscore: "c", nova: 1, categories: ["en:beverages", "en:fruit-juices", "en:orange-juices"], canon_ing: "orange juice" },
  { barcode: "8906017290026", name: "Bisleri Water 250ml", brand: "Bisleri", nutriscore: "b", nova: 1, categories: ["en:beverages", "en:waters"], canon_ing: "water" },
];

type P = { name: string; canon: string | null; loc: Loc; exp: number | null; qty?: number; unit?: string; barcode?: string; fruit?: string };

// ~15 active items, a few expiring today/tomorrow so "Use these first" has something to say
const pantry: P[] = [
  { name: "Amul Taaza Toned Milk", canon: "milk", loc: "fridge", exp: 0, qty: 1, unit: "l" },
  { name: "Fresh Paneer", canon: "paneer", loc: "fridge", exp: 1, qty: 200, unit: "g" },
  { name: "Tomatoes", canon: "tomato", loc: "shelf", exp: 1, qty: 500, unit: "g" },
  { name: "Spinach (palak)", canon: "spinach", loc: "fridge", exp: 2, qty: 1, unit: "bunch" },
  { name: "Banana", canon: "banana", loc: "shelf", exp: 2, qty: 6, fruit: "Banana" },
  { name: "Mother Dairy Dahi", canon: "curd", loc: "fridge", exp: 3, qty: 400, unit: "g" },
  { name: "Frooti mango drink", canon: "mango juice", loc: "fridge", exp: 4, barcode: "8902579000370" },
  { name: "Tropicana Orange Juice", canon: "orange juice", loc: "fridge", exp: 5, qty: 1, unit: "l", barcode: "3502110009449" },
  { name: "Onions", canon: "onion", loc: "shelf", exp: 14, qty: 1, unit: "kg" },
  { name: "Eggs", canon: "eggs", loc: "fridge", exp: 12, qty: 1, unit: "dozen" },
  { name: "Frozen green peas", canon: "peas", loc: "freezer", exp: 60, qty: 500, unit: "g" },
  { name: "Aashirvaad Atta", canon: "atta", loc: "shelf", exp: 90, qty: 5, unit: "kg" },
  { name: "Quaker Oats", canon: "oats", loc: "shelf", exp: 150, barcode: "8901491103800" },
  { name: "Kissan Mixed Fruit Jam", canon: "jam", loc: "fridge", exp: 45, barcode: "8901030922787" },
  { name: "Nutella", canon: "chocolate spread", loc: "shelf", exp: 80, barcode: "3017624010701" },
  { name: "Parle-G Gold", canon: "biscuits", loc: "shelf", exp: 30, barcode: "8901719125478" },
  { name: "Coriander leaves", canon: "coriander leaves", loc: "fridge", exp: -1, qty: 1, unit: "bunch" },
];

// closed items across the last few months feed the insights charts
const history: { name: string; canon: string; status: "used" | "wasted"; closedAgo: number; expAgo: number }[] = [];
const names = ["Milk", "Bread", "Curd", "Paneer", "Spinach", "Tomatoes", "Bananas", "Apples", "Chicken", "Coriander"];
const canons = ["milk", "bread", "curd", "paneer", "spinach", "tomato", "banana", "apple", "chicken", "coriander leaves"];
for (let m = 0; m < 6; m++) {
  const used = 9 + ((m * 3) % 5);
  const wasted = Math.max(1, 6 - m);
  for (let i = 0; i < used + wasted; i++) {
    const k = (i + m) % names.length;
    const closedAgo = m * 30 + ((i * 3) % 27) + 1;
    // most used items are finished a day or two before they expire = "rescued"
    history.push({ name: names[k], canon: canons[k], status: i < used ? "used" : "wasted", closedAgo, expAgo: i < used ? closedAgo - 1 - (i % 3) : closedAgo + 2 });
  }
}

async function main() {
  console.log("users…");
  const demo = await user(DEMO.email, "Riya");
  const mate = await user(MATE.email, "Asha");
  const e2e = await user(E2E.email, "Test Cook");
  const other = await user(OTHER.email, "Neighbour");

  await sb.from("profiles").upsert([
    { user_id: demo, name: "Riya", allergens: [], diet: "vegetarian", alcohol_ok: false, onboarded: true },
    // Asha's nut allergy makes the Nutella card go red
    { user_id: mate, name: "Asha", allergens: ["nuts", "peanuts"], diet: "vegetarian", alcohol_ok: false, onboarded: true },
    { user_id: e2e, name: "Test Cook", allergens: [], diet: "none", alcohol_ok: false, onboarded: true },
    { user_id: other, name: "Neighbour", allergens: [], diet: "none", alcohol_ok: true, onboarded: true },
  ]);

  console.log("households…");
  const hid = await house(DEMO.code, DEMO.house, [
    { id: demo, role: "owner" },
    { id: mate, role: "member" },
  ]);
  await house(E2E.code, E2E.house, [{ id: e2e, role: "owner" }]);
  const oid = await house(OTHER.code, OTHER.house, [{ id: other, role: "owner" }]);

  console.log("products…");
  const { error: pe } = await sb.from("products").upsert(products.map((p) => ({ allergens: [], additives: [], nutrients: {}, ...p })));
  if (pe) throw pe;

  console.log("pantry…");
  const rows = pantry.map((p, i) => ({
    household_id: hid,
    name: p.name,
    canon_ing: p.canon,
    qty: p.qty ?? 1,
    unit: p.unit ?? "pcs",
    location: p.loc,
    barcode: p.barcode ?? null,
    fruit: p.fruit ?? null,
    expires_at: p.exp === null ? null : day(p.exp),
    added_at: at(-(i % 6) - 1, 10),
    // bulk inserts send null for missing keys instead of the column default, so be explicit
    status: "active" as const,
    closed_at: null,
  }));
  const closed = history.map((h) => ({
    household_id: hid,
    name: h.name,
    canon_ing: h.canon,
    qty: 1,
    unit: "pcs",
    location: "fridge" as Loc,
    expires_at: day(-h.expAgo),
    added_at: at(-h.closedAgo - 5, 10),
    status: h.status,
    closed_at: at(-h.closedAgo, 20),
  }));
  const { data: ins, error: ie } = await sb.from("pantry_items").insert([...rows, ...closed]).select("id, name");
  if (ie) throw ie;
  await sb.from("pantry_items").insert({ household_id: oid, name: "Neighbour's secret biscuits", canon_ing: "biscuits", expires_at: day(10) });

  console.log("scans…");
  const graded = products.filter((p) => p.nutriscore);
  const scans = Array.from({ length: 36 }, (_, i) => {
    // later months lean healthier so the trend line has a story
    const m = Math.floor(i / 6);
    const pool = graded.filter((p) => (m < 3 ? true : ["a", "b", "c"].includes(p.nutriscore as string)));
    return { user_id: i % 3 ? demo : mate, household_id: hid, barcode: pool[(i * 7) % pool.length].barcode, scanned_at: at(-(150 - m * 30 - (i % 6) * 4), 18) };
  });
  const { error: se } = await sb.from("scans").insert(scans);
  if (se) throw se;

  console.log("cook log + shopping list…");
  const used = (ins ?? []).filter((r) => ["Fresh Paneer", "Tomatoes"].includes(r.name)).map((r) => r.id);
  await sb.from("cook_logs").insert({ household_id: hid, src: "mealdb", recipe_id: "52807", title: "Baingan Bharta", cooked_at: at(-2, 20), used_items: used });
  await sb.from("shop_items").insert([
    { household_id: hid, name: "Milk", canon_ing: "milk", qty: 2, unit: "l", done: false },
    { household_id: hid, name: "Amul milk", canon_ing: "milk", qty: 1, unit: "l", done: false },
    { household_id: hid, name: "Bread", canon_ing: "bread", qty: 1, unit: "pcs", done: false },
    { household_id: hid, name: "Ginger", canon_ing: "ginger", qty: 100, unit: "g", done: false },
    { household_id: hid, name: "Frooti", canon_ing: "mango juice", qty: 2, unit: "pcs", done: false },
    { household_id: hid, name: "Basmati rice", canon_ing: "basmati rice", qty: 1, unit: "kg", done: true },
  ]);

  console.log(`\ndone. demo household "${DEMO.house}" — invite code ${DEMO.code}`);
  console.log(`sign in as ${DEMO.email} (magic link) or see README for the e2e user.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
