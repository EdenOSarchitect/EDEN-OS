# EDEN-NET-001 — Large-Scale Communications Evidence Overlay

EDEN-NET-001 explores EDEN OS as a communications **control/evidence plane** layered over existing transports rather than as a replacement for TCP/IP, QUIC, 5G/6G or satellite link protocols.

## Experiment

The current controlled simulation instantiated:

- 1,024 logical nodes;
- 3,000 messages;
- 25 failed nodes;
- 200 congested links;
- Ed25519 node delegation;
- nonce/replay protection;
- policy-aware routing using latency, cost, energy, reliability and security constraints;
- per-message Marble commitments; and
- Merkle aggregation into a single network evidence root.

## Measured local result

- 3,000 / 3,000 messages delivered in this scenario;
- average path length: 3.40 hops;
- average simulated route latency: 6.16 ms;
- p95 simulated route latency: 8.52 ms;
- local Python routing rate: ~121 messages/s;
- average payload: ~2,111 bytes;
- average EDEN evidence record: ~403 bytes/message;
- evidence/payload byte ratio: ~19.09%;
- adversarial/integrity tests: 7/7 PASS.

Network evidence root:

`e33f429504da69b98c64be7a0f4614aba770963c09ba397410fcbcc0757d1a9d`

## What the result means

The experiment supports the feasibility of the **logical architecture**: signed delegation, replay rejection, tamper-evident message evidence, policy-aware route selection and hierarchical aggregation can coexist in a 1,024-node local simulation.

It does **not** establish telecom, satellite, internet-scale or production performance.

The most important negative result is the evidence overhead. At the simulated payload mix, a full EDEN record added roughly 19% as many bytes as the underlying payload. That is too expensive for many small-message systems.

## Next engineering target

EDEN-NET-002 should reduce evidence overhead by using:

1. batch commitments;
2. compact binary schemas;
3. per-window Merkle roots rather than transferring full Marble metadata with every message;
4. route evidence sampling by policy;
5. local retention of detailed evidence with remote inclusion proofs; and
6. benchmark comparison against no-EDEN, full-Marble and root-only modes.

Primary target:

`evidence_bytes / payload_bytes < 1%` for high-volume communications while retaining verifiable inclusion proofs.

## Truth boundary

This is a controlled simulation. No live telecom, satellite, cloud, internet backbone or other third-party communications network was touched. No economic savings or production deployment is claimed.
