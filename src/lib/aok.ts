import type { EvidenceClass } from "@/lib/eden";

export type AokAction =
  | "OBSERVE"
  | "MODEL"
  | "REPRODUCE"
  | "EXECUTE_LAB"
  | "EXECUTE_PRODUCTION"
  | "CLAIM_MEASURED";

export type AokVerdict = "CLEARED" | "HOLD" | "DENIED";

export interface AokCapability {
  id: string;
  name: string;
  project: string;
  claim: string;
  labels: EvidenceClass[];
  scope: string;
  lastHash?: string;
}

export interface AokDecision {
  verdict: AokVerdict;
  rule: string;
  note: string;
}

export const AOK_POLICY = "aok-v1.0.2 / clearance-r1";

export const AOK_ACTIONS: {
  id: AokAction;
  name: string;
  intent: string;
}[] = [
  {
    id: "OBSERVE",
    name: "OBSERVE",
    intent: "Read-only. Shadow-compatible. No execution path is altered.",
  },
  {
    id: "MODEL",
    name: "MODEL",
    intent: "Produce a counterfactual. Output remains labelled MODELLED.",
  },
  {
    id: "REPRODUCE",
    name: "REPRODUCE",
    intent: "Replay a published run against its recorded hash and policy.",
  },
  {
    id: "EXECUTE_LAB",
    name: "EXECUTE · LAB",
    intent: "Run on a labelled lab or demonstration surface. Not production.",
  },
  {
    id: "EXECUTE_PRODUCTION",
    name: "EXECUTE · PRODUCTION",
    intent: "Take control of live traffic. The commercial control gate.",
  },
  {
    id: "CLAIM_MEASURED",
    name: "CLAIM MEASURED",
    intent: "Assert a physical or production measurement in public copy.",
  },
];

export const AOK_CAPABILITIES: AokCapability[] = [
  {
    id: "chrononav-v2",
    name: "ChronoNav V2 scheduler",
    project: "CHRONONAV",
    claim: "Frozen-policy scheduler exceeds EDF on mean true utility.",
    labels: ["REPRODUCIBLE", "SIMULATED"],
    scope: "10,000 simulated blind trials. Not a production cluster measurement.",
    lastHash: "a3f1c9e2b7d04c18",
  },
  {
    id: "reuse-50k",
    name: "High-reuse classifier",
    project: "REFINERY",
    claim: "High-reuse synthetic retains most bytes as KEEP / STRUCTURE.",
    labels: ["REPRODUCIBLE", "SYNTHETIC"],
    scope: "50,000-unit synthetic corpus. Real-world reuse is workload-specific.",
    lastHash: "b81e0c44d2aa9176",
  },
  {
    id: "merkle-1gib",
    name: "Merkle inclusion proofs",
    project: "MARBLE",
    claim: "Packet commitments verify against a 1 GiB tree.",
    labels: ["REPRODUCIBLE"],
    scope: "1,048,576 packets · 100 sampled proofs valid. Offline experiment.",
    lastHash: "c0d9f77a1e5b3320",
  },
  {
    id: "marble-suite",
    name: "Marble identity suite",
    project: "MARBLE",
    claim: "Identity, provenance and tamper fixtures hold.",
    labels: ["REPRODUCIBLE"],
    scope: "52 tests · 12 destructive tamper fixtures · both signing backends.",
    lastHash: "d4aa19b0ce78f201",
  },
  {
    id: "mint-rate",
    name: "Primary mint rate",
    project: "MARBLE",
    claim: "Local mint throughput on an x86-64 container.",
    labels: ["MEASURED"],
    scope: "1,031.9 marbles / s. x86-64 container. Not Termux. Not a networked SLA.",
    lastHash: "e7c2b1d98a0045fe",
  },
  {
    id: "termux",
    name: "Physical edge node",
    project: "AURA",
    claim: "EDEN components execute on Android / Termux.",
    labels: ["IMPLEMENTED", "PARTIALLY MEASURED"],
    scope: "Single device, lab. Energy figures are device-reported.",
  },
  {
    id: "refinery-demo",
    name: "Refinery demonstration loop",
    project: "REFINERY",
    claim: "Client console classifies a synthetic envelope and mints a Marble.",
    labels: ["IMPLEMENTED", "DEMONSTRATION"],
    scope: "In-browser deterministic split. Not a live production workload.",
  },
  {
    id: "aok-kernel",
    name: "AOK clearance kernel",
    project: "AOK",
    claim: "Evidence class is bound to admissible action before a claim or execute.",
    labels: ["IMPLEMENTED", "DEMONSTRATION"],
    scope: "This console. Not a production admission controller.",
  },
  {
    id: "anchor",
    name: "Public timestamp anchor",
    project: "MARBLE",
    claim: "Externally timestamped immutability.",
    labels: ["PROPOSED"],
    scope: "Local marbles are tamper-evident. They are not immutable against mint-key rewrite.",
  },
  {
    id: "aura-geometry",
    name: "Orbital geometry / SGP4",
    project: "AURA",
    claim: "Position, Doppler and FSPL under modelled orbital geometry.",
    labels: ["MODELLED"],
    scope: "Numerical model. Not a physical RF measurement.",
  },
  {
    id: "aura-rf",
    name: "Physical satellite RF",
    project: "AURA",
    claim: "Physical satellite RF reception.",
    labels: ["NOT MEASURED"],
    scope: "Not measured. Must not be described as tested.",
  },
  {
    id: "aura-network",
    name: "Operational satellite network",
    project: "AURA",
    claim: "An operational EDEN satellite network.",
    labels: ["NOT CLAIMED"],
    scope: "Not claimed. Ambition is not a capability.",
  },
];

export function aokDecide(cap: AokCapability, action: AokAction): AokDecision {
  const L = new Set(cap.labels);

  if (L.has("NOT CLAIMED") || L.has("UNSUPPORTED")) {
    if (action === "OBSERVE") {
      return {
        verdict: "CLEARED",
        rule: "R0",
        note: "Observation of a non-claim is always permitted. The board may display the refusal.",
      };
    }
    return {
      verdict: "DENIED",
      rule: "R1",
      note: "Capability is explicitly not claimed. No model, execution or public measurement may proceed.",
    };
  }

  if (L.has("NOT MEASURED") && action === "CLAIM_MEASURED") {
    return {
      verdict: "DENIED",
      rule: "R1B",
      note: "Physical measurement is labelled NOT MEASURED. AOK will not mint a MEASURED claim.",
    };
  }

  if (action === "OBSERVE") {
    return {
      verdict: "CLEARED",
      rule: "R2",
      note: "Read-only observation does not require a measured evidence class. This is the shadow-mode gate.",
    };
  }

  if (action === "CLAIM_MEASURED") {
    if (L.has("MEASURED")) {
      return {
        verdict: "CLEARED",
        rule: "R3",
        note: `Measured inside the stated scope only. Scope: ${cap.scope}`,
      };
    }
    return {
      verdict: "DENIED",
      rule: "R4",
      note: "AOK will not mint a MEASURED claim from modelled, simulated, synthetic, proposed or demonstration evidence.",
    };
  }

  if (action === "EXECUTE_PRODUCTION") {
    if (L.has("NOT MEASURED") || L.has("PROPOSED") || L.has("MODELLED") || L.has("SIMULATED") || L.has("SYNTHETIC")) {
      return {
        verdict: "DENIED",
        rule: "R7",
        note: "Production execute is denied until a measured, scoped production validation exists.",
      };
    }
    return {
      verdict: "HOLD",
      rule: "R5",
      note: "Even implemented or locally measured surfaces do not imply production control. Shadow first. Pilot required.",
    };
  }

  if (action === "EXECUTE_LAB") {
    if (
      L.has("IMPLEMENTED") ||
      L.has("REPRODUCIBLE") ||
      L.has("DEMONSTRATION") ||
      L.has("PARTIALLY MEASURED") ||
      L.has("MEASURED")
    ) {
      return {
        verdict: "CLEARED",
        rule: "R8",
        note: "Lab or demonstration execution is permitted under the labelled evidence class. It does not upgrade the class.",
      };
    }
    if (L.has("MODELLED") || L.has("SIMULATED") || L.has("SYNTHETIC") || L.has("PROPOSED") || L.has("NOT MEASURED")) {
      return {
        verdict: "HOLD",
        rule: "R9",
        note: "Lab execution of a modelled-only or unmeasured capability is held pending an implemented surface.",
      };
    }
    return {
      verdict: "DENIED",
      rule: "R10",
      note: "No implemented or reproducible surface is attached.",
    };
  }

  if (action === "REPRODUCE") {
    if (L.has("REPRODUCIBLE") || L.has("MEASURED")) {
      return {
        verdict: "CLEARED",
        rule: "R11",
        note: "Reproduction of a published run is permitted. Replay does not create a new measurement.",
      };
    }
    return {
      verdict: "HOLD",
      rule: "R12",
      note: "No reproducible artefact is attached to this capability.",
    };
  }

  if (action === "MODEL") {
    if (L.has("NOT MEASURED")) {
      return {
        verdict: "CLEARED",
        rule: "R13B",
        note: "Modelling an unmeasured physical channel is permitted. Outputs remain MODELLED. Physical RF stays NOT MEASURED.",
      };
    }
    return {
      verdict: "CLEARED",
      rule: "R13",
      note: "Modelling is permitted. Outputs remain labelled MODELLED / COUNTERFACTUAL / ESTIMATE.",
    };
  }

  return {
    verdict: "HOLD",
    rule: "R15",
    note: "Unclassified request. Default is HOLD.",
  };
}

export function aokMatrix(cap: AokCapability): Record<AokAction, AokDecision> {
  const out = {} as Record<AokAction, AokDecision>;
  for (const action of AOK_ACTIONS) {
    out[action.id] = aokDecide(cap, action.id);
  }
  return out;
}

export function fleetSummary(caps: AokCapability[] = AOK_CAPABILITIES) {
  let cleared = 0;
  let hold = 0;
  let denied = 0;
  for (const cap of caps) {
    const d = aokDecide(cap, "EXECUTE_PRODUCTION");
    if (d.verdict === "CLEARED") cleared += 1;
    else if (d.verdict === "HOLD") hold += 1;
    else denied += 1;
  }
  return { n: caps.length, cleared, hold, denied };
}
