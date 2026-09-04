import { z } from "zod";

/** Strict schema validation for all incoming inputs (OWASP A03 / LLM02). */

const text = (max: number) => z.string().trim().min(1).max(max);

export const moodSchema = z.object({
  energy: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  overwhelm: z.number().int().min(1).max(5),
});

export const createEntrySchema = z.object({
  message: text(8000),
  entryId: z.string().min(1).max(200).optional(),
  mood: moodSchema.optional(),
});

export const createDecisionSchema = z.object({
  entryId: z.string().min(1).max(200).nullable().optional(),
  statement: text(500),
  rationale: text(4000),
  prediction: text(1000),
  confidence: z.number().int().min(1).max(99),
  reviewInDays: z.number().int().min(1).max(365).default(21),
});

export const resolveDecisionSchema = z.object({
  outcome: text(4000),
  wentAsPredicted: z.number().min(0).max(1), // 1 = fully as predicted, 0 = opposite
});

export const searchSchema = z.object({
  query: text(300),
});

export const digestSchema = z.object({
  days: z.number().int().min(1).max(60).default(7),
});
