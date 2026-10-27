import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const dir = path.join(__dirname, "..", "..", "supabase", "migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(path.join(dir, f), "utf8"))
  .join("\n")
  .toLowerCase();

const tables = ["profiles", "households", "members", "products", "pantry_items", "scans", "shop_items", "cook_logs", "push_subs", "api_cache", "quota_log"];
const hhTables = ["pantry_items", "shop_items", "cook_logs"];

describe("RLS in the migration", () => {
  it("enables row level security on every table", () => {
    for (const t of tables) expect(sql, t).toContain(`alter table public.${t} enable row level security`);
  });

  it("scopes household data to members", () => {
    for (const t of hhTables) {
      const re = new RegExp(`create policy \\w+ on public\\.${t} for all to authenticated\\s+using \\(public\\.is_member\\(household_id\\)\\) with check \\(public\\.is_member\\(household_id\\)\\)`);
      expect(sql, t).toMatch(re);
    }
  });

  it("gives server-only tables no client policies at all", () => {
    for (const t of ["api_cache", "quota_log"]) expect(sql).not.toMatch(new RegExp(`create policy \\w+ on public\\.${t}\\b`));
    // products: read-only for signed-in users
    expect(sql).not.toMatch(/create policy \w+ on public\.products for (insert|update|delete|all)/);
  });

  it("ships the join_household rpc", () => {
    expect(sql).toContain("create or replace function public.join_household(code text)");
  });
});

// Live check against a real Supabase project. Runs only when these are set (see README):
// RLS_TEST_SUPABASE_URL, RLS_TEST_ANON_KEY, RLS_TEST_SERVICE_KEY
const url = process.env.RLS_TEST_SUPABASE_URL;
const anon = process.env.RLS_TEST_ANON_KEY;
const service = process.env.RLS_TEST_SERVICE_KEY;

describe.skipIf(!url || !anon || !service)("RLS against a live database", () => {
  it("blocks reading and writing another household's pantry", async () => {
    const admin = createClient(url as string, service as string, { auth: { persistSession: false } });
    const stamp = Date.now();
    const pw = `Rls-${stamp}-x!`;
    const mk = async (tag: string) => {
      const email = `rls-${tag}-${stamp}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
      if (error || !data.user) throw error ?? new Error("no user");
      const c = createClient(url as string, anon as string, { auth: { persistSession: false } });
      await c.auth.signInWithPassword({ email, password: pw });
      return { id: data.user.id, c };
    };
    const a = await mk("a");
    const b = await mk("b");
    const made: string[] = [];
    try {
      const { data: hhA } = await a.c.rpc("create_household", { hname: "A flat" });
      const { data: hhB } = await b.c.rpc("create_household", { hname: "B flat" });
      made.push(hhA as string, hhB as string);
      const { error: insErr } = await a.c.from("pantry_items").insert({ household_id: hhA, name: "Milk" });
      expect(insErr).toBeNull();

      // B can't see A's pantry...
      const { data: seen } = await b.c.from("pantry_items").select("id").eq("household_id", hhA);
      expect(seen).toEqual([]);
      // ...or write into it
      const { error: sneak } = await b.c.from("pantry_items").insert({ household_id: hhA, name: "Sneaky" });
      expect(sneak).not.toBeNull();
      // ...or see the household itself
      const { data: house } = await b.c.from("households").select("id").eq("id", hhA);
      expect(house).toEqual([]);
    } finally {
      if (made.length) await admin.from("households").delete().in("id", made);
      await admin.auth.admin.deleteUser(a.id);
      await admin.auth.admin.deleteUser(b.id);
    }
  }, 30000);
});
