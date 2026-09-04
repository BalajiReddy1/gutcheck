import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Uniform error escalation - never leak stack traces, always a clean status. */
export function handleError(err: unknown) {
  if (err instanceof AuthError) return fail(err.message, 401);
  if (err instanceof ZodError) {
    return fail("Invalid input: " + err.issues.map((i) => i.message).join("; "), 422);
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  // Surface model/DB availability problems to the UI so it can offer a retry.
  const status = /unavailable|GEMINI_API_KEY|Firestore/i.test(message) ? 503 : 500;
  console.error("[api]", message);
  return fail(message, status);
}
