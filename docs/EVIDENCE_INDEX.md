# EDEN OS Evidence Index — 2026-08-12

This index separates what is implemented, what has been measured locally, what is reproducible in principle, what remains proposed, and what is unsupported.

## Evidence classes

- IMPLEMENTED: source or protocol code exists.
- MEASURED: executed locally with recorded output.
- REPRODUCIBLE: sufficient public source/instructions exist for another person to rerun.
- PROPOSED: architecture/experiment defined but not executed against the target system.
- UNSUPPORTED: claim exceeds current evidence.

## Current index

| Area | Status | Evidence |
|---|---|---|
| Chrononav telemetry | IMPLEMENTED | Python source in `src/`; current public tree includes v2 and experimental HyperMarble code |
| HyperMarble / N-D lattice | IMPLEMENTED | `src/eden_hypermarble_nd.py` and `src/eden_3d_marble_lattice.py` |
| Hardened v6 integrity/evidence suite | MEASURED_LOCAL | 12/12 local tests passed on 2026-08-12; publication of the complete runnable v6 source/tests remains in progress |
| Full-stack v5 Python sources | MEASURED_LOCAL_SYNTAX | Five application modules compiled successfully locally on 2026-08-12 |
| ML digits training flow | MEASURED_LOCAL | 97.2222% test accuracy; quality preserved in zero-variance feature-removal candidate, but compute performance regressed in that run |
| Sparse 2^64 namespace | MEASURED_LOCAL | 1,024 materialized Hive-bound states; inclusion proof and mutation tests passed locally |
| Sparse namespace adversarial run | MEASURED_LOCAL | 18/18 local tests passed; no root-integrity bypass or SHA-256 preimage recovered |
| Bitcoin protocol benchmark | MEASURED_SIMULATION | Controlled local protocol simulation only; no live Bitcoin network touched |
| Bitcoin efficiency result | SIMULATED | ~0.195% useful-hash improvement came from explicit assumed operational-loss reductions, not measured miner results |
| EDEN-SAT-001 | PROPOSED | Quality-preserving selective-downlink protocol; no real satellite execution |
| Customer savings | UNSUPPORTED | No independently reconciled customer savings yet |
| Global deployment / named tenants | UNSUPPORTED | No evidence of global deployment or named production tenants |
| EEA-4 economic | NOT_REACHED | Requires measured resource reduction plus reconciled financial evidence |
| EEA-5 independent | NOT_REACHED | Requires reproduction by a genuinely independent party |

## Evidence ladder rule

`candidate -> integrity -> quality -> resource delta -> economic reconciliation -> independent validation`

No stage is silently promoted to the next.

## Highest-value current gap

The highest-value gap is external reproducibility. The immediate goal is to publish the full runnable hardened source/test bundle with pinned dependencies, then obtain a clean-host reproduction by someone outside the creator/ChatGPT environment.
