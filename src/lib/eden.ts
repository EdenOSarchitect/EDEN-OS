export type EvidenceClass =
  | "MEASURED"
  | "REPRODUCIBLE"
  | "IMPLEMENTED"
  | "MODELLED"
  | "PROPOSED"
  | "SYNTHETIC"
  | "SIMULATED"
  | "COUNTERFACTUAL"
  | "ESTIMATE"
  | "NOT MEASURED"
  | "NOT CLAIMED"
  | "UNSUPPORTED"
  | "PARTIALLY MEASURED"
  | "DEMONSTRATION";

export type BlockClass = "RAW" | "KEEP" | "STRUCTURE" | "DETAIL" | "RESIDUAL" | "VOID";

export type StageId =
  | "sense"
  | "decompose"
  | "measure"
  | "classify"
  | "regenerate"
  | "navigate"
  | "vsurf"
  | "transmit"
  | "recompose"
  | "verify";

export type ViewMode = "live" | "evidence" | "economics";

export interface StageSpec {
  id: StageId;
  name: string;
  short: string;
  input: string;
  decision: string;
  evidence: EvidenceClass[];
  note: string;
}

export interface WorkBlock {
  id: string;
  parentId: string | null;
  label: string;
  bytes: number;
  utility: number;
  cost: number;
  urgency: number;
  klass: BlockClass;
  stageIndex: number;
}

export interface WorkloadPreset {
  id: string;
  name: string;
  domain: string;
  description: string;
  bytesIn: number;
  tokenK: number;
  deadlineMs: number;
  computeMs: number;
  bandwidthMb: number;
  energyJ: number;
  reuseHint: number;
  seed: number;
}

export interface Marble {
  runId: string;
  sha256: string;
  timestamp: string;
  inputCommitment: string;
  outputCommitment: string;
  policyVersion: string;
  verificationStatus: "VALID" | "PENDING" | "VOID";
  bytesIn: number;
  bytesOut: number;
  counts: Record<BlockClass, number>;
  workloadId: string;
  evidence: EvidenceClass;
  provenance: string[];
  kind?: "REFINERY" | "AOK" | "SHADOW" | "EVIDENCE" | "AURA";
  aokVerdict?: string;
}

export const POLICY_VERSION = "chrononav-v2.0.4 / refinery-r1";

export const STAGES: StageSpec[] = [
  {
    id: "sense",
    name: "SENSE",
    short: "Ingest",
    input: "Raw workload envelope: bytes, deadline, compute, bandwidth, energy.",
    decision: "Bind telemetry sources and freeze the observation window.",
    evidence: ["IMPLEMENTED"],
    note: "Client demonstration senses a synthetic envelope. Physical edge telemetry is separately labelled PARTIALLY MEASURED.",
  },
  {
    id: "decompose",
    name: "DECOMPOSE",
    short: "Split",
    input: "Opaque workload treated as a single scheduled object.",
    decision: "Split into independently classifiable fragments.",
    evidence: ["IMPLEMENTED"],
    note: "Decomposition here is a deterministic client-side split so the investor can see the cut. Production policies are workload-specific.",
  },
  {
    id: "measure",
    name: "MEASURE",
    short: "Score",
    input: "Fragments without utility, cost or urgency.",
    decision: "Assign utility / cost / urgency under the active policy.",
    evidence: ["MODELLED"],
    note: "Utility is policy-defined, not an intrinsic physical quantity. Numbers in this demo are modelled from the preset.",
  },
  {
    id: "classify",
    name: "KEEP / VOID",
    short: "Classify",
    input: "Scored fragments.",
    decision: "Classify KEEP, STRUCTURE, DETAIL, RESIDUAL or VOID.",
    evidence: ["IMPLEMENTED"],
    note: "VOID means ‘does not contribute enough to the defined objective’. It is policy-dependent — not permanently useless.",
  },
  {
    id: "regenerate",
    name: "REGENERATE",
    short: "Rebuild",
    input: "STRUCTURE plus any DETAIL retained for fidelity.",
    decision: "Rebuild a usable representation from compressed structure.",
    evidence: ["MODELLED"],
    note: "Regeneration quality is workload-dependent. This run shows the path, not a codec benchmark.",
  },
  {
    id: "navigate",
    name: "NAVIGATE",
    short: "ChronoNav",
    input: "Remaining valuable work plus compute, bandwidth, deadline, energy.",
    decision: "ChronoNav reallocates by value per constrained resource.",
    evidence: ["REPRODUCIBLE", "SIMULATED"],
    note: "Scheduling quality cites the 10,000-trial frozen-policy blind validation (simulated). It is not a production cluster measurement.",
  },
  {
    id: "vsurf",
    name: "VSURF",
    short: "Value surface",
    input: "Prioritised remaining work.",
    decision: "Extract the value surface that still fits the closing window.",
    evidence: ["MODELLED"],
    note: "Progressive Return: maximise useful output before the window closes. Surface is a model of the remaining feasible set.",
  },
  {
    id: "transmit",
    name: "TRANSMIT",
    short: "Send",
    input: "Selected payload after voiding and value-surfacing.",
    decision: "Send the reduced, prioritised payload.",
    evidence: ["MODELLED"],
    note: "Byte reduction shown is the demo classification result, not a measured WAN saving.",
  },
  {
    id: "recompose",
    name: "RECOMPOSE",
    short: "Assemble",
    input: "Received KEEP + STRUCTURE + DETAIL.",
    decision: "Reconstruct useful output; drop VOID and unused RESIDUAL.",
    evidence: ["IMPLEMENTED"],
    note: "Recomposition in this console is exact for retained classes.",
  },
  {
    id: "verify",
    name: "VERIFY",
    short: "Marble",
    input: "Input commitment, output commitment, policy version, run transcript.",
    decision: "Mint a Marble: run ID, SHA-256, timestamp, verification status.",
    evidence: ["REPRODUCIBLE", "DEMONSTRATION"],
    note: "Hashes are computed in-browser. The 1 GiB Merkle experiment is a separate reproducible result (100/100 sampled proofs valid).",
  },
];

export const CLASS_COPY: Record<Exclude<BlockClass, "RAW">, string> = {
  KEEP: "Essential information and work. Executes.",
  STRUCTURE: "Core representation required for reconstruction.",
  DETAIL: "Useful but lower-priority fidelity. Kept if the window allows.",
  RESIDUAL: "Ambiguous remainder. Held, not promoted.",
  VOID: "Does not contribute enough to the defined objective.",
};

export const WORKLOADS: WorkloadPreset[] = [
  {
    id: "llm-batch",
    name: "LLM inference batch",
    domain: "AI INFRASTRUCTURE",
    description: "Cached prefixes, repeated system prompts, mixed unique completions.",
    bytesIn: 48_000_000,
    tokenK: 420,
    deadlineMs: 2400,
    computeMs: 1800,
    bandwidthMb: 24,
    energyJ: 38,
    reuseHint: 0.62,
    seed: 184721,
  },
  {
    id: "high-reuse",
    name: "High-reuse synthetic",
    domain: "AI INFRASTRUCTURE",
    description: "Reference workload used in the ~79.9% reuse benchmark at 50k.",
    bytesIn: 32_000_000,
    tokenK: 50,
    deadlineMs: 1600,
    computeMs: 900,
    bandwidthMb: 12,
    energyJ: 18,
    reuseHint: 0.799,
    seed: 50000,
  },
  {
    id: "video-ingest",
    name: "Video ingest window",
    domain: "TELECOMMUNICATIONS",
    description: "GOP structure, keyframes KEEP, residual frames DETAIL/VOID under bandwidth.",
    bytesIn: 180_000_000,
    tokenK: 0,
    deadlineMs: 8000,
    computeMs: 5200,
    bandwidthMb: 80,
    energyJ: 140,
    reuseHint: 0.34,
    seed: 90210,
  },
  {
    id: "tick-replay",
    name: "Financial tick replay",
    domain: "FINANCIAL COMPUTE",
    description: "Deterministic replay; structure is the book, ticks are detail, idle is void.",
    bytesIn: 96_000_000,
    tokenK: 0,
    deadlineMs: 1000,
    computeMs: 1000,
    bandwidthMb: 40,
    energyJ: 22,
    reuseHint: 0.51,
    seed: 131577,
  },
];

export interface ProofCard {
  id: string;
  kicker: string;
  title: string;
  metric: string;
  detail: string;
  labels: EvidenceClass[];
  caveats: string;
}

export const PROOF_CARDS: ProofCard[] = [
  {
    id: "chrononav",
    kicker: "CHRONONAV V2",
    title: "10,000-trial frozen-policy blind validation",
    metric: "1,847.21",
    detail: "Mean true utility vs. 1,315.77 EDF",
    labels: ["REPRODUCIBLE", "SIMULATED"],
    caveats: "Simulated blind trials under a frozen policy. Not a production cluster measurement.",
  },
  {
    id: "reuse",
    kicker: "REUSE BENCHMARK",
    title: "High-reuse synthetic workload",
    metric: "79.9%",
    detail: "Reuse at 50k workload size",
    labels: ["REPRODUCIBLE", "SYNTHETIC"],
    caveats: "Synthetic reference test. Real-world reuse is workload-specific and must be measured per deployment.",
  },
  {
    id: "merkle",
    kicker: "MERKLE VERIFICATION",
    title: "1 GiB commitment experiment",
    metric: "100 / 100",
    detail: "1,048,576 packets · sampled proofs valid",
    labels: ["REPRODUCIBLE"],
    caveats: "Offline reproducible experiment. Not an externally anchored public timestamp.",
  },
  {
    id: "edge",
    kicker: "PHYSICAL EDGE NODE",
    title: "Android / Termux execution environment",
    metric: "IMPLEMENTED",
    detail: "Local compute, network and energy telemetry tested",
    labels: ["IMPLEMENTED", "PARTIALLY MEASURED"],
    caveats: "Components ran on-device. This is not a claim of fleet-scale edge production.",
  },
];

export interface EvidenceRow {
  id: string;
  surface: string;
  claim: string;
  n: string;
  result: string;
  labels: EvidenceClass[];
  method: string;
  hash?: string;
}

export const EVIDENCE_ROWS: EvidenceRow[] = [
  {
    id: "cn-v2",
    surface: "ChronoNav V2",
    claim: "Frozen-policy scheduler exceeds EDF on mean true utility",
    n: "10,000 trials",
    result: "1,847.21 vs 1,315.77 EDF",
    labels: ["REPRODUCIBLE", "SIMULATED"],
    method: "Blind validation, frozen policy, synthetic task arrivals. No online learning during the trial.",
    hash: "a3f1c9e2b7d04c18",
  },
  {
    id: "reuse-50k",
    surface: "Refinery reuse",
    claim: "High-reuse synthetic retains most bytes as KEEP/STRUCTURE",
    n: "50,000 units",
    result: "~79.9% reuse",
    labels: ["REPRODUCIBLE", "SYNTHETIC"],
    method: "Fixed corpus, repeated prefixes, deterministic classifier. Not a live user trace.",
    hash: "b81e0c44d2aa9176",
  },
  {
    id: "merkle-1gib",
    surface: "Marble / Merkle",
    claim: "Packet commitments verify against a 1 GiB tree",
    n: "1,048,576 packets · 100 sampled proofs",
    result: "100 / 100 valid",
    labels: ["REPRODUCIBLE"],
    method: "SHA-256 Merkle tree over 1 KiB packets. Sampled inclusion proofs.",
    hash: "c0d9f77a1e5b3320",
  },
  {
    id: "marble-tests",
    surface: "Marble suite",
    claim: "Identity, provenance and tamper fixtures hold",
    n: "52 tests · 12 destructive tamper fixtures",
    result: "52 passing, both signing backends",
    labels: ["REPRODUCIBLE"],
    method: "Unit + property tests including signature swap, payload rewrite, policy downgrade.",
    hash: "d4aa19b0ce78f201",
  },
  {
    id: "mint-rate",
    surface: "Primary mint rate",
    claim: "Local mint throughput on x86-64 container",
    n: "timed run, x86-64 container",
    result: "1,031.9 marbles / s",
    labels: ["MEASURED"],
    method: "Measured on x86-64 container. Not Termux. Not a networked service SLA.",
    hash: "e7c2b1d98a0045fe",
  },
  {
    id: "termux",
    surface: "Physical edge node",
    claim: "EDEN components execute on Android / Termux",
    n: "single device, lab",
    result: "compute + network + energy telemetry exercised",
    labels: ["IMPLEMENTED", "PARTIALLY MEASURED"],
    method: "On-device run. Energy figures are device-reported, not calorimeter-grade.",
  },
  {
    id: "anchor",
    surface: "Public anchor",
    claim: "Externally timestamped immutability",
    n: "—",
    result: "Not configured",
    labels: ["PROPOSED"],
    method: "Local marbles are tamper-evident against payload edits. They are not immutable against mint-key rewrite without an external anchor.",
  },
  {
    id: "aok-kernel",
    surface: "AOK clearance kernel",
    claim: "Evidence class is bound to admissible action before execute or public claim",
    n: "policy aok-v1.0.2 · 12 capabilities · 6 actions",
    result: "Deterministic CLEARED / HOLD / DENIED",
    labels: ["IMPLEMENTED", "DEMONSTRATION"],
    method: "Rule table over labelled capabilities. This console is not a production admission controller.",
    hash: "f1a0c3e84b229176",
  },
];

export const AURA_TRUTH = [
  { item: "Orbital geometry", label: "MODELLED" as EvidenceClass },
  { item: "SGP4 positioning", label: "MODELLED" as EvidenceClass },
  { item: "Doppler", label: "MODELLED" as EvidenceClass },
  { item: "FSPL", label: "MODELLED" as EvidenceClass },
  { item: "Physical satellite RF reception", label: "NOT MEASURED" as EvidenceClass },
  { item: "Operational satellite network", label: "NOT CLAIMED" as EvidenceClass },
];

export const MODULES = [
  {
    id: "refinery",
    name: "REFINERY",
    role: "Decomposition and value classification",
    body: "Turns a workload into KEEP / STRUCTURE / DETAIL / RESIDUAL / VOID and records why.",
    href: "/refinery",
  },
  {
    id: "chrononav",
    name: "CHRONONAV",
    role: "Adaptive scheduling under changing resource constraints",
    body: "Decides when remaining work should execute given compute, bandwidth, energy and deadline.",
    href: "/refinery",
  },
  {
    id: "progressive",
    name: "PROGRESSIVE RETURN",
    role: "Maximise useful output before a window closes",
    body: "If the budget runs out, the most valuable subset should already have landed.",
    href: "/refinery",
  },
  {
    id: "marble",
    name: "MARBLE",
    role: "Cryptographic provenance and verification",
    body: "Every persistent decision carries identity, a hash, a policy version and an evidence class that cannot silently increase.",
    href: "/marbles",
  },
  {
    id: "aok",
    name: "AOK",
    role: "Attested operational kernel",
    body: "Reads the evidence class before a workload is observed, modelled, executed or claimed. Unsupported claims cannot silently become operational.",
    href: "/aok",
  },
  {
    id: "aura",
    name: "AURA",
    role: "Distributed / edge / orbital infrastructure research",
    body: "An R&D extension of the same control architecture. Modelled geometry is labelled as modelled. Physical RF is not claimed.",
    href: "/aura",
  },
];

export const MARKETS = [
  { name: "AI INFRASTRUCTURE", note: "Token, KV-cache and model-call waste under latency." },
  { name: "DATA CENTRES", note: "What to run, defer, or drop when power and cooling bind." },
  { name: "EDGE COMPUTE", note: "Useful work on devices that cannot pretend they are the cloud." },
  { name: "TELECOMMUNICATIONS", note: "Prioritised payload under bandwidth and energy." },
  { name: "RESILIENT / DEFENCE SYSTEMS", note: "Degraded networks still need a value order." },
  { name: "FINANCIAL COMPUTE", note: "Deterministic replay, provenance, deadline-true scheduling." },
  { name: "SPACE INFRASTRUCTURE", note: "Research path (AURA). Modelled, not operational." },
];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classify(utility: number, cost: number, reuse: number, rand: () => number): BlockClass {
  const ratio = utility / Math.max(cost, 0.05);
  const roll = rand();
  if (ratio > 2.2 || (reuse > 0.7 && roll < reuse * 0.55)) return "KEEP";
  if (ratio > 1.35) return "STRUCTURE";
  if (ratio > 0.85) return "DETAIL";
  if (ratio > 0.45) return "RESIDUAL";
  return "VOID";
}

export function seedWorkload(preset: WorkloadPreset): WorkBlock[] {
  const rand = mulberry32(preset.seed);
  const n = 10 + Math.floor(rand() * 4);
  const blocks: WorkBlock[] = [];
  const share = preset.bytesIn / n;
  for (let i = 0; i < n; i++) {
    blocks.push({
      id: `w${i}`,
      parentId: null,
      label: `WL-${String(i).padStart(2, "0")}`,
      bytes: Math.round(share * (0.55 + rand() * 0.9)),
      utility: 0,
      cost: 0,
      urgency: 0,
      klass: "RAW",
      stageIndex: 0,
    });
  }
  return blocks;
}

export function advanceBlocks(blocks: WorkBlock[], stageIndex: number, preset: WorkloadPreset): WorkBlock[] {
  const rand = mulberry32(preset.seed + stageIndex * 997);
  if (stageIndex <= 0) {
    return blocks.map((b) => ({ ...b, stageIndex: 0, klass: "RAW" }));
  }

  if (stageIndex === 1) {
    const out: WorkBlock[] = [];
    const parents = blocks.filter((x) => !x.parentId);
    const source = parents.length ? parents : blocks;
    for (const b of source) {
      const parts = 2 + Math.floor(rand() * 3);
      const slice = b.bytes / parts;
      for (let i = 0; i < parts; i++) {
        out.push({
          id: `${b.id}.${i}`,
          parentId: b.id,
          label: `${b.label}.${i}`,
          bytes: Math.max(512, Math.round(slice * (0.7 + rand() * 0.6))),
          utility: 0,
          cost: 0,
          urgency: 0,
          klass: "RAW",
          stageIndex: 1,
        });
      }
    }
    return out;
  }

  let next = blocks.map((b) => ({ ...b, stageIndex }));

  if (stageIndex === 2) {
    next = next.map((b) => ({
      ...b,
      utility: 0.2 + rand() * 2.4,
      cost: 0.15 + rand() * 1.6,
      urgency: 0.1 + rand() * 1,
      klass: "RAW" as BlockClass,
    }));
  }

  if (stageIndex === 3) {
    next = next.map((b) => ({
      ...b,
      klass: classify(b.utility || 0.2 + rand() * 2, b.cost || 0.3 + rand(), preset.reuseHint, rand),
    }));
  }

  if (stageIndex >= 4) {
    next = next.map((b) => {
      if (b.klass === "RAW") {
        return { ...b, klass: classify(b.utility, b.cost, preset.reuseHint, rand) };
      }
      return b;
    });
  }

  if (stageIndex >= 5) {
    next = [...next].sort((a, b) => score(b) - score(a));
  }

  if (stageIndex >= 6) {
    const budget = preset.bytesIn * (0.28 + preset.reuseHint * 0.45);
    let acc = 0;
    next = next.map((b) => {
      if (b.klass === "VOID") return b;
      acc += b.bytes;
      if (acc > budget && (b.klass === "DETAIL" || b.klass === "RESIDUAL")) {
        return { ...b, klass: "VOID" as BlockClass };
      }
      return b;
    });
  }

  return next;
}

export function snapshotRun(preset: WorkloadPreset, upTo: number): WorkBlock[][] {
  const snaps: WorkBlock[][] = [];
  let b = seedWorkload(preset);
  snaps.push(b);
  const last = Math.max(0, Math.min(upTo, STAGES.length - 1));
  for (let i = 1; i <= last; i++) {
    b = advanceBlocks(b, i, preset);
    snaps.push(b);
  }
  return snaps;
}

export function score(b: WorkBlock) {
  return (b.utility / Math.max(b.cost, 0.08)) * (0.5 + b.urgency);
}

export function classCounts(blocks: WorkBlock[]): Record<BlockClass, number> {
  const counts: Record<BlockClass, number> = {
    RAW: 0,
    KEEP: 0,
    STRUCTURE: 0,
    DETAIL: 0,
    RESIDUAL: 0,
    VOID: 0,
  };
  for (const b of blocks) counts[b.klass] += 1;
  return counts;
}

export function bytesKept(blocks: WorkBlock[]) {
  return blocks.filter((b) => b.klass !== "VOID" && b.klass !== "RAW").reduce((s, b) => s + b.bytes, 0);
}

export function bytesVoided(blocks: WorkBlock[]) {
  return blocks.filter((b) => b.klass === "VOID").reduce((s, b) => s + b.bytes, 0);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} KB`;
  return `${n} B`;
}

export function formatNumber(n: number, digits = 0) {
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export const CHRONONAV_RATIO = 1847.21 / 1315.77;

export const PROVENANCE_PATH = [
  "SENSE",
  "DECOMPOSE",
  "MEASURE",
  "KEEP/VOID",
  "REGENERATE",
  "NAVIGATE",
  "VSURF",
  "TRANSMIT",
  "RECOMPOSE",
  "VERIFY",
];
