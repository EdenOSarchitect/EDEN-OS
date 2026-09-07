# EDEN Compute Optimizer v1

EDEN Compute Optimizer v1 is the first narrow commercial wrapper around EDEN's optimisation/evidence work.

It provides three modes:

- `OBSERVE` — execute normally and record baseline telemetry.
- `OPTIMIZE` — execute normally on first sight, then permit exact-input deterministic reuse.
- `PROVE` — run a baseline, prime the cache with a conventional execution, then run the same input through EDEN and compare outputs/host-process timing.

## Truth boundary

v1 supports **exact-input deterministic reuse only**. It does not claim semantic equivalence, production datacentre savings, economic savings, energy savings, or independent validation.

The report labels its scope as a single-host exact-input deterministic reuse demonstration and commits the full report with SHA-256.

## Run the proof demo

From the repository root:

```bash
python -m optimizer_v1.demo --iterations 300000
```

The report is written to:

```text
optimizer_v1/results/EDEN_COMPUTE_OPTIMIZER_V1.json
```

## Run the API

```bash
python -m optimizer_v1.server
```

Default address: `127.0.0.1:8766`

Endpoints:

- `GET /health`
- `POST /analyze`
- `POST /execute`
- `POST /verify`
- `POST /prove`
- `GET /report`

Example:

```bash
curl -s http://127.0.0.1:8766/prove \
  -H 'content-type: application/json' \
  -d '{"workload_id":"demo","payload":{"numbers":[1,2,3,4,5]}}'
```

## Tests

```bash
python -m unittest discover -s optimizer_v1/tests -v
```

No third-party Python dependencies are required for v1.
