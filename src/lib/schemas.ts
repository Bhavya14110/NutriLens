import { z } from "zod";
import { ALLERGENS } from "@/lib/allergens";
import { CANON } from "@/lib/canon-data";

// shared between forms (client) and route handlers (server)
const allergenIds = ALLERGENS.map((a) => a.id) as [string, ...string[]];
const canonIds = CANON.map((c) => c.id) as [string, ...string[]];

export const dietSchema = z.enum(["none", "vegetarian", "vegan", "jain"]);
export const locSchema = z.enum(["fridge", "freezer", "shelf"]);
export const canonSchema = z.enum(canonIds);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you").max(60),
  allergens: z.array(z.enum(allergenIds)).max(allergenIds.length),
  diet: dietSchema,
  alcohol_ok: z.boolean(),
});

export const hhNameSchema = z.string().trim().min(1, "Give your household a name").max(60);
export const inviteSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{8}$/, "Invite codes are 8 characters, like 3fa9c210");

export const onboardSchema = profileSchema.extend({
  hh: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("create"), name: hhNameSchema }),
    z.object({ mode: z.literal("join"), code: inviteSchema }),
    z.object({ mode: z.literal("keep") }),
  ]),
});

export const newPantrySchema = z.object({
  name: z.string().trim().min(1, "Name it").max(120),
  barcode: z.string().regex(/^\d{6,14}$/).nullish(),
  fruit: z.string().trim().max(60).nullish(),
  canon_ing: canonSchema.nullish(),
  qty: z.coerce.number().positive("Quantity must be more than 0").max(10000),
  unit: z.string().trim().min(1).max(12),
  location: locSchema,
  expires_at: isoDate.nullable(),
});

export const pantryPatchSchema = z
  .object({
    status: z.enum(["active", "used", "wasted"]).optional(),
    useQty: z.coerce.number().positive().optional(), // "partly used": how much went
    qty: z.coerce.number().min(0).max(10000).optional(),
    unit: z.string().trim().min(1).max(12).optional(),
    expires_at: isoDate.nullable().optional(),
    location: locSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    canon_ing: canonSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change");

export const shopAddSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Add a name").max(120),
        canon_ing: canonSchema.nullish(),
        qty: z.coerce.number().positive().max(1000).default(1),
        unit: z.string().trim().min(1).max(12).default("pcs"),
      }),
    )
    .min(1)
    .max(40),
});

export const shopPatchSchema = z.object({ ids: z.array(z.uuid()).min(1).max(50), done: z.boolean() });
export const shopDeleteSchema = z.object({ ids: z.array(z.uuid()).min(1).max(50) });

export const cookSchema = z.object({
  src: z.enum(["spoon", "mealdb"]),
  recipe_id: z.string().regex(/^\d{1,9}$/),
  title: z.string().trim().min(1).max(200),
  used: z
    .array(z.object({ id: z.uuid(), mode: z.enum(["all", "part"]), qty: z.coerce.number().positive().optional() }))
    .max(40),
});

export const scanSchema = z.object({ barcode: z.string().regex(/^\d{6,14}$/, "Barcodes are 6–14 digits") });
