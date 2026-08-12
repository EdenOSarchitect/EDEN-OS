# EDEN OS Reproducibility

## Goal

Move EDEN evidence from creator-reported/local execution to independently reproducible evidence without upgrading unsupported claims.

## Local execution completed 2026-08-12

`EDEN_OS_HARDENED_v6/tests/run_all.py` was executed in a clean extracted local directory using Python 3.13.5.

Result:

```text
PASS seal_tamper
PASS hmac_wrong_secret
PASS evidence_order
PASS candidate_not_saving
PASS marble_transfer_and_replay
PASS receipt_signature_tamper
PASS identity_key_conflict
PASS chrononav_uncertainty
PASS rcu_name
PASS reclaim_fail_closed
PASS audit_chain
PASS seal_metadata_tamper
{
  "passed": 12,
  "total": 12,
  "ok": true
}
```

This is **MEASURED_LOCAL**, not independent reproduction.

The five Python application modules in the extracted `EDEN_FULL_STACK_v5/app/` tree also passed `python -m py_compile` locally. That is a syntax/import compilation check only, not a production deployment test.

## Required public reproduction path

1. Clone the public repository.
2. Use a clean Python environment.
3. Install only pinned public dependencies once dependency locks are published.
4. Run the conformance/hardening suite.
5. Save stdout/stderr and environment metadata.
6. Recompute file hashes.
7. Report any failure without reinterpretation.
8. Repeat on a second independent host.

## Claim rule

A local pass may be called MEASURED. It becomes REPRODUCIBLE only when the complete runnable source, dependencies and instructions are public and a clean execution can be performed from that public tree. It becomes EEA-5 only after a genuinely independent person or organization reproduces the relevant result.

## Known blockers

- complete hardened-v6 source/test publication is still being completed;
- dependency versions/lock file need publication;
- CI is not yet active on the current public commit;
- no independent clean-host result exists yet;
- no customer workload or economic reconciliation exists.

## Negative-results rule

EDEN must preserve regressions. The previously measured digits optimization preserved model accuracy but worsened measured compute performance in that local run; it must not be described as a saving.
