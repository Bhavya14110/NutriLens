import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCtx, type Ctx } from "@/lib/session";
import type { HouseholdRow } from "@/types/db";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be JSON.");
  }
  const res = schema.safeParse(raw);
  if (!res.success) throw new ApiError(400, res.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return res.data;
}

export type HhCtx = Ctx & { hh: HouseholdRow };

// wraps a route: turns thrown ApiErrors into clean json and never leaks stack traces
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message);
      console.error("[api]", err);
      return fail(500, "Something went wrong on our side. Please try again.");
    }
  };
}

export async function needUser(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) throw new ApiError(401, "Please sign in first.");
  return ctx;
}

export async function needHh(): Promise<HhCtx> {
  const ctx = await needUser();
  if (!ctx.hh) throw new ApiError(409, "Create or join a household first.");
  return ctx as HhCtx;
}
