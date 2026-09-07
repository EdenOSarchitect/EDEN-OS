from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from optimizer_v1.core import EdenOptimizer


def workload(payload):
    iterations = int(payload["iterations"])
    seed = float(payload.get("seed", 1.0))
    acc = 0.0
    for i in range(iterations):
        x = seed + (i % 997) / 997.0
        acc += math.sin(x) * math.cos(x / 2.0) + math.sqrt(x + 1.0)
    return {"iterations": iterations, "seed": seed, "result": round(acc, 12)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run EDEN Compute Optimizer v1 proof demo")
    parser.add_argument("--iterations", type=int, default=300000)
    parser.add_argument("--seed", type=float, default=1.0)
    parser.add_argument("--out", default="optimizer_v1/results/EDEN_COMPUTE_OPTIMIZER_V1.json")
    args = parser.parse_args()

    optimizer = EdenOptimizer()
    report = optimizer.prove(
        workload_id="EDEN-COMPUTE-OPTIMIZER-V1-DEMO",
        payload={"iterations": args.iterations, "seed": args.seed},
        executor=workload,
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print("=" * 72)
    print(" EDEN COMPUTE OPTIMIZER v1")
    print("=" * 72)
    print(f"Output equivalence:      {report['verification']['output_equivalence']}")
    print(f"Reuse observed:          {report['verification']['reuse_observed']}")
    print(f"CPU reduction:           {report['metrics']['cpu_reduction_pct']:.2f}%")
    print(f"Wall reduction:          {report['metrics']['wall_reduction_pct']:.2f}%")
    print(f"Full executions avoided: {report['metrics']['full_execution_avoided']}")
    print(f"Evidence class:          {report['evidence']['class']}")
    print(f"Independent validation: {report['evidence']['independent_validation']}")
    print(f"Report commitment:       {report['report_commitment']}")
    print(f"Saved:                   {out}")
    print("=" * 72)

    return 0 if report["verification"]["output_equivalence"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
