# EDEN OS

**Experimental computational efficiency, measurement, provenance and verification architecture.**

EDEN OS is a research framework for connecting computational work to quality, resource use, provenance and evidence. The central rule is simple:

`candidate inefficiency -> integrity -> quality -> measured resource delta -> economic reconciliation -> independent validation`

No stage is silently promoted to the next.

## Start here

- [`docs/EVIDENCE_INDEX.md`](docs/EVIDENCE_INDEX.md) — what is implemented, measured, simulated, proposed or unsupported.
- [`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md) — reproduction protocol and current blockers.
- [`docs/PUBLIC_UPDATE_2026-08-12.md`](docs/PUBLIC_UPDATE_2026-08-12.md) — latest public research update.
- [`SECURITY.md`](SECURITY.md) — public secret-handling and security boundaries.
- [`evidence/`](evidence/) — machine-readable execution evidence.

## Hardened v6 public test path

A fresh local run on 2026-08-12 passed 12/12 hardening tests. The public source/test tree is being populated under `hardened_v6/`.

```bash
python -m pip install -r hardened_v6/requirements.txt
python hardened_v6/tests/run_all.py
```

The 12 tests cover seal tampering, HMAC mismatch, evidence-order enforcement, candidate-vs-saving separation, Marble transfer/replay behavior, signature tampering, identity-key conflicts, Chrononav uncertainty, unit naming, fail-closed reclaim policy, audit-chain tampering and seal metadata authentication.

A local pass is **MEASURED**, not an independent security certification. See [EDEN-REPRO-001](../../issues/1) for the external reproduction milestone.

## Core research areas

- evidence-gated efficiency accounting;
- Marbles as content-addressed production/provenance records;
- Chrononav operational trajectory telemetry;
- HyperMarble / N-dimensional logical state research;
- sparse evidence namespaces;
- AI/data quality-preserving efficiency experiments;
- Bitcoin/ASIC efficiency simulations and protocol evidence;
- EDEN-SAT-001 selective-downlink research.

## Truth boundary

EDEN OS does **not** currently claim global deployment, named production tenants, realized customer savings, real Bitcoin-miner efficiency gains, satellite deployment, recognized financial value for Marbles, validated new physics, or independent accreditation.

Private signing keys, API credentials and production secrets are intentionally excluded from this repository.

## Attribution

**Daniel Noel Clarke — Creator / Founder / Architect / Vision Holder, EDEN OS**

Project attribution is a project declaration; independent legal/IP determinations require external evidence and process.

## Status

Experimental research software. External engineers are invited to reproduce, falsify and improve the published evidence.
