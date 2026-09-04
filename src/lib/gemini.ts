import "server-only";

import { GoogleGenAI } from "@google/genai";

/**
 * Resilient Model Fallback Ladder (Production Directive 6).
 * Never call a single hardcoded model in a single try.
 */
const MODEL_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
] as const;

const RECOVERABLE = [/\b429\b/, /\b404\b/, /\b500\b/, /\b503\b/, /UNAVAILABLE/i, /RESOURCE_EXHAUSTED/i, /NOT_FOUND/i, /INTERNAL/i, /overloaded/i];

function isRecoverable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RECOVERABLE.some((re) => re.test(msg));
}

let client: GoogleGenAI | null = null;
function genai(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. On Cloud Run it is injected from Secret Manager; " +
        "locally set it in .env.local.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export interface GenOptions {
  system?: string;
  /** JSON schema hint - when set, response is requested as application/json. */
  json?: boolean;
  temperature?: number;
}

/**
 * Standard helper (Production Directive 6): uniform resilience for every route.
 * Walks the model ladder on recoverable errors before bubbling up.
 */
export async function generateContentWithFallback(
  contents: string | { role: string; parts: { text: string }[] }[],
  opts: GenOptions = {},
): Promise<string> {
  let lastErr: unknown;
  for (const model of MODEL_LADDER) {
    try {
      const res = await genai().models.generateContent({
        model,
        contents: contents as never,
        config: {
          ...(opts.system ? { systemInstruction: opts.system } : {}),
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
          temperature: opts.temperature ?? 0.7,
        },
      });
      const text = res.text?.trim();
      if (text) return text;
      lastErr = new Error(`Empty response from ${model}`);
    } catch (err) {
      lastErr = err;
      if (!isRecoverable(err)) break;
    }
  }
  throw new Error(
    `Gemini unavailable after trying ${MODEL_LADDER.length} models: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

/** Parse a JSON object out of a model response, tolerating ```json fences. */
export function parseJsonObject<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
