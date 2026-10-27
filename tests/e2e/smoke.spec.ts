import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// Needs a real Supabase project that has been migrated + seeded (npm run seed).
// Signs in as the seeded e2e user through the real magic-link flow (token_hash -> /auth/confirm).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = "e2e@nutrilens.app";
const BARCODE = "8902579000370"; // Frooti, seeded + live on Open Food Facts

test.skip(!url || !service, "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and run npm run seed) to run the smoke test.");

test("sign in → open a seeded product → add to pantry → see it on Home", async ({ page }) => {
  const admin = createClient(url as string, service as string, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL });
  expect(error).toBeNull();
  const hash = data.properties?.hashed_token;
  expect(hash).toBeTruthy();

  await page.goto(`/auth/confirm?token_hash=${hash}&type=email&next=/home`);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: /what's cooking/i })).toBeVisible();

  await page.goto(`/product/${BARCODE}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /Nutri-Score/i }).first()).toBeVisible();

  const name = `E2E Frooti ${Date.now()}`;
  await page.getByRole("button", { name: "Add to pantry" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name", { exact: true }).fill(name);
  // expiring tomorrow puts it in the "Use these first" strip on Home
  const tomorrow = new Date(Date.now() + 330 * 60000 + 86400000).toISOString().slice(0, 10);
  await sheet.getByLabel("Expires on").fill(tomorrow);
  await sheet.getByRole("button", { name: "Add to pantry" }).click();
  await expect(page.getByText(`${name} added to your`)).toBeVisible();

  await page.goto("/home");
  await expect(page.getByRole("region", { name: /use these first/i }).getByText(name)).toBeVisible();

  // tidy up so reruns stay clean
  await admin.from("pantry_items").delete().eq("name", name);
});
