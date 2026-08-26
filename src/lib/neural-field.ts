import type { EvidenceClass } from "@/lib/eden";

export type NeuralStageId =
  | "ingest"
  | "bind"
  | "score"
  | "route"
  | "refine"
  | "verify";

export interface NeuralSignal {
  id: string;
  source: string;
  payload: string;
  utility: number;
  confidence: number;
  cost: number;
  urgency: number;
}

export interface NeuralStageResult {
  id: NeuralStageId;
  name: string;
  evidence: EvidenceClass[];
  inputCount: number;
  outputCount: number;
  note: string;
}

export interface NeuralFieldRun {
  runId: string;
  startedAt: string;
  policy: string;
  stages: NeuralStageResult[];
  accepted: NeuralSignal[];
  held: NeuralSignal[];
  score: number;
}

export const NEURAL_POLICY = "neural-field-r0.1 / client-demonstration";

export const NEURAL_STAGES: Array<{
  id: NeuralStageId;
  name: string;
  evidence: EvidenceClass[];
  note: string;
}> = [
  {
    id: "ingest",
    name: "INGEST",
    evidence: ["IMPLEMENTED", "DEMONSTRATION"],
    note: "Accept labelled signals into a deterministic client-side field.",
  },
  {
    id: "bind",
    name: "BIND",
    evidence: ["IMPLEMENTED"],
    note: "Bind source, confidence, urgency and cost to each signal before routing.",
  },
  {
    id: "score",
    name: "SCORE",
    evidence: ["MODELLED"],
    note: "Compute a policy score from utility, confidence, urgency and cost.",
  },
  {
    id: "route",
    name: "ROUTE",
    evidence: ["MODELLED", "DEMONSTRATION"],
    note: "Route high-value signals forward and hold low-confidence or low-value signals.",
  },
  {
    id: "refine",
    name: "REFINE",
    evidence: ["IMPLEMENTED", "MODELLED"],
    note: "Pass accepted signals into the EDEN refinery control path conceptually; production coupling is not yet claimed.",
  },
  {
    id: "verify",
    name: "VERIFY",
    evidence: ["IMPLEMENTED", "DEMONSTRATION"],
    note: "Emit a deterministic transcript suitable for Marble commitment in a later integration step.",
  },
];

export const DEFAULT_NEURAL_SIGNALS: NeuralSignal[] = [
  { id: "sig-aura", source: "AURA", payload: "orbital geometry update", utility: 0.82, confidence: 0.74, cost: 0.32, urgency: 0.68 },
  { id: "sig-refinery", source: "REFINERY", payload: "reuse opportunity", utility: 0.91, confidence: 0.88, cost: 0.25, urgency: 0.57 },
  { id: "sig-aok", source: "AOK", payload: "clearance state", utility: 0.97, confidence: 0.96, cost: 0.18, urgency: 0.93 },
  { id: "sig-shadow", source: "SHADOW", payload: "counterfactual saving", utility: 0.71, confidence: 0.63, cost: 0.41, urgency: 0.49 },
  { id: "sig-edge", source: "EDGE", payload: "device telemetry", utility: 0.65, confidence: 0.52, cost: 0.58, urgency: 0.76 },
];

export function neuralScore(signal: NeuralSignal): number {
  const numerator = signal.utility * 0.4 + signal.confidence * 0.3 + signal.urgency * 0.2;
  const penalty = Math.max(0.05, signal.cost) * 0.1;
  return Math.max(0, Math.min(1, numerator - penalty));
}

export function runNeuralField(signals: NeuralSignal[] = DEFAULT_NEURAL_SIGNALS): NeuralFieldRun {
  const scored = signals.map((signal) => ({ signal, score: neuralScore(signal) }));
  const accepted = scored.filter((item) => item.score >= 0.55).map((item) => item.signal);
  const held = scored.filter((item) => item.score < 0.55).map((item) => item.signal);
  const mean = scored.length ? scored.reduce((sum, item) => sum + item.score, 0) / scored.length : 0;
  const now = Date.now();

  const stages: NeuralStageResult[] = NEURAL_STAGES.map((stage) => ({
    ...stage,
    inputCount: signals.length,
    outputCount: stage.id === "route" || stage.id === "refine" || stage.id === "verify" ? accepted.length : signals.length,
  }));

  return {
    runId: `NF-${now.toString(36).toUpperCase()}`,
    startedAt: new Date(now).toISOString(),
    policy: NEURAL_POLICY,
    stages,
    accepted,
    held,
    score: mean,
  };
}
