# EDEN Agent Mesh v1

Status: experimental / not production security certified.

EDEN Agent Mesh is a bounded hierarchical agent fabric that carries EDEN evidence and resource constraints across every delegation edge.

## Tree

```text
EDEN ROOT
├── AI HIVE
│   ├── training agents
│   ├── inference agents
│   └── quality agents
├── SAT HIVE
│   ├── constellation agents
│   ├── ground agents
│   └── routing agents
├── ROBOT HIVE
│   ├── perception agents
│   ├── task agents
│   └── safety agents
└── ANGEL HIVE
    ├── edge agents
    └── human-authorization agents
```

The implementation is generic: these are profiles, not separate trust systems.

## Mesh invariants

Every agent has a tenant, parent, capability set, depth, and CRV policy. Every child must be strictly no more privileged than its parent. Every message is authenticated, expires, carries a nonce, commits to its payload, states an evidence level, and carries a CRV budget. Replays, cross-tenant messages, capability escalation, resource-budget escalation, tampering, and insufficient evidence fail closed.

## CRV

In this module CRV means **Constrained Resource Verification**. It is an EDEN policy/accounting primitive, not a new encryption algorithm. A CRV envelope bounds input bytes, output bytes, compute units, and wall time, and declares the minimum evidence level required. Child agents cannot increase a parent's resource ceilings or weaken its evidence requirement.

Destructive actions require EEA-2 quality evidence when the CRV policy enables that guard, preserving the existing hardened_v6 rule that candidate classification alone cannot authorize reclaim.

## Evidence ladder

The mesh consumes the existing EDEN evidence ladder:

- EEA-0 candidate
- EEA-1 integrity
- EEA-2 quality
- EEA-3 measured efficiency
- EEA-4 economic evidence
- EEA-5 independent validation

The mesh does not promote evidence merely because an agent asserts a result.

## Shared state

Every accepted topology mutation or authenticated message advances a hash commitment:

`S[t+1] = SHA256(domain || canonical({previous:S[t], event:E[t]}))`

This is a compact tamper-evident state commitment, not distributed consensus. A future constellation/shared-Marble protocol must separately define quorum, partition recovery, finality, key rotation, revocation, and durable storage.

## Cryptography boundary

The reference implementation uses HMAC-SHA-256 for local authenticated-envelope testing. Production cross-host or satellite deployment must replace this single shared secret with per-node identities, key rotation, secure key storage, and standardized classical/PQ authenticated key establishment/signatures. Proprietary Hive/CRV mathematics must not be represented as cryptographically secure without independent cryptanalysis.

## Scale

The tree is bounded by `max_depth` and `max_children`. Large logical meshes should be generated/configured rather than materialized without limits. Production scale testing must measure memory, CPU, message throughput, recovery, revocation propagation, and partition behavior.

## Tests

`tests/test_agent_mesh.py` covers authenticated round-trip, replay rejection, payload tamper rejection, capability escalation, CRV escalation, destructive-action quality gating, and bounded fanout expansion.
