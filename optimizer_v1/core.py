from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Callable, Dict, Optional


class OptimizationMode(str, Enum):
    OBSERVE = "OBSERVE"
    OPTIMIZE = "OPTIMIZE"
    PROVE = "PROVE"


@dataclass
class ExecutionRecord:
    workload_id: str
    input_hash: str
    mode: str
    reused: bool
    cpu_seconds: float
    wall_seconds: float
    output_hash: str
    output: Any


class EdenOptimizer:
    """Minimal commercial wrapper for EDEN Compute Optimizer v1.

    v1 performs exact-input deterministic reuse only. This deliberately keeps
    the first product narrow and fail-closed: an item is reused only when its
    canonical input hash is already present in the local verified cache.
    """

    VERSION = "1.0.0"
    EVIDENCE_CLASS = "MEASURED_HOST_PROCESS_CPU"

    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._history: list[ExecutionRecord] = []

    @staticmethod
    def _canonical(value: Any) -> bytes:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    @classmethod
    def _hash(cls, value: Any) -> str:
        return "sha256:" + hashlib.sha256(cls._canonical(value)).hexdigest()

    def health(self) -> Dict[str, Any]:
        return {
            "product": "EDEN Compute Optimizer",
            "version": self.VERSION,
            "status": "ok",
            "modes": [m.value for m in OptimizationMode],
            "cache_entries": len(self._cache),
        }

    def analyze(self, workload_id: str, payload: Any) -> Dict[str, Any]:
        input_hash = self._hash(payload)
        cached = input_hash in self._cache
        return {
            "workload_id": workload_id,
            "input_hash": input_hash,
            "exact_reuse_candidate": cached,
            "decision_basis": "canonical exact-input hash",
            "claim": "candidate reuse is not a measured saving until baseline-vs-EDEN execution is performed",
        }

    def execute(
        self,
        workload_id: str,
        payload: Any,
        executor: Callable[[Any], Any],
        mode: OptimizationMode | str = OptimizationMode.OPTIMIZE,
    ) -> ExecutionRecord:
        mode = OptimizationMode(mode)
        input_hash = self._hash(payload)
        reused = False

        cpu_start = time.process_time()
        wall_start = time.perf_counter()

        if mode != OptimizationMode.OBSERVE and input_hash in self._cache:
            output = self._cache[input_hash]["output"]
            reused = True
        else:
            output = executor(payload)
            output_hash = self._hash(output)
            if mode != OptimizationMode.OBSERVE:
                self._cache[input_hash] = {"output": output, "output_hash": output_hash}

        cpu_seconds = time.process_time() - cpu_start
        wall_seconds = time.perf_counter() - wall_start
        output_hash = self._hash(output)

        record = ExecutionRecord(
            workload_id=workload_id,
            input_hash=input_hash,
            mode=mode.value,
            reused=reused,
            cpu_seconds=cpu_seconds,
            wall_seconds=wall_seconds,
            output_hash=output_hash,
            output=output,
        )
        self._history.append(record)
        return record

    def verify(self, baseline: ExecutionRecord, eden: ExecutionRecord) -> Dict[str, Any]:
        equivalent = baseline.output_hash == eden.output_hash
        return {
            "output_equivalence": "PASS" if equivalent else "FAIL",
            "baseline_output_hash": baseline.output_hash,
            "eden_output_hash": eden.output_hash,
            "reuse_observed": eden.reused,
        }

    def prove(
        self,
        workload_id: str,
        payload: Any,
        executor: Callable[[Any], Any],
    ) -> Dict[str, Any]:
        baseline = self.execute(workload_id, payload, executor, OptimizationMode.OBSERVE)

        # Prime verified exact-input cache with one conventional execution.
        prime = self.execute(workload_id, payload, executor, OptimizationMode.OPTIMIZE)
        eden = self.execute(workload_id, payload, executor, OptimizationMode.PROVE)

        verification = self.verify(baseline, eden)
        cpu_reduction_pct = ((baseline.cpu_seconds - eden.cpu_seconds) / baseline.cpu_seconds * 100.0) if baseline.cpu_seconds > 0 else 0.0
        wall_reduction_pct = ((baseline.wall_seconds - eden.wall_seconds) / baseline.wall_seconds * 100.0) if baseline.wall_seconds > 0 else 0.0

        report = {
            "product": "EDEN Compute Optimizer",
            "version": self.VERSION,
            "workload_id": workload_id,
            "mode": "PROVE",
            "baseline": asdict(baseline),
            "prime": asdict(prime),
            "eden": asdict(eden),
            "verification": verification,
            "metrics": {
                "cpu_reduction_pct": cpu_reduction_pct,
                "wall_reduction_pct": wall_reduction_pct,
                "full_execution_avoided": 1 if eden.reused else 0,
            },
            "evidence": {
                "class": self.EVIDENCE_CLASS,
                "independent_validation": False,
                "economic_saving_claimed": False,
                "energy_saving_claimed": False,
                "scope": "single-host exact-input deterministic reuse demonstration",
            },
        }
        report["report_commitment"] = self._hash(report)
        return report

    def report(self) -> Dict[str, Any]:
        return {
            "product": "EDEN Compute Optimizer",
            "version": self.VERSION,
            "executions": [asdict(r) for r in self._history],
        }
