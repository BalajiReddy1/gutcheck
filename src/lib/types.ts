export interface MoodSample {
  energy: number; // 1..5
  mood: number; // 1..5
  overwhelm: number; // 1..5
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
  at: number;
}

export interface Entry {
  id: string;
  title: string;
  turns: ChatTurn[];
  mood: MoodSample | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type DecisionStatus = "open" | "resolved";

export interface Decision {
  id: string;
  entryId: string | null;
  statement: string;
  rationale: string;
  prediction: string;
  confidence: number; // 0..100
  redTeam: string[]; // Gemini's stress-test points
  status: DecisionStatus;
  reviewDueAt: number;
  createdAt: number;
  // filled on resolution
  outcome?: string;
  outcomeScore?: number; // 0 = perfectly right, 1 = perfectly wrong (Brier component)
  resolvedAt?: number;
}

export interface Digest {
  id: string;
  periodStart: number;
  periodEnd: number;
  episodeTitle: string;
  recap: string;
  insight: string;
  entryCount: number;
  createdAt: number;
}

export interface CalibrationSummary {
  resolvedCount: number;
  brier: number | null; // mean squared error of confidence vs outcome
  bias: number; // mean of (stated confidence - observed rate), -1..1; + is overconfident
  tendency: "overconfident" | "underconfident" | "well-calibrated" | "not enough data";
}
