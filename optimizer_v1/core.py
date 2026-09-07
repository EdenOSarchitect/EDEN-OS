from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Callable, Dict


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

    v1 performs exact-input deterministic reuse only. Reuse is scoped by both
    workload identity and canonical payload so identical inputs cannot collide
    across different workload adapters.
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

    @classmethod
    def _input_hash(cls, workload_id: str, payload: Any) -> str:
        if not workload_id:
            raise ValueError("workload_id is required")
        return cls._hash({"workload_id": workload_id, "payload": payload})

    def health(self) -> Dict[str, Any]:
        return {
            "product": "EDEN Compute Optimizer",
            "version": self.VERSION,
            "status": "ok",
            "modes": [m.value for m in OptimizationMode],
            "cache_entries": len(self._cache),
        }

    def analyze(self, workload_id: str, payload: Any) -> Dict[str, Any]:
        input_hash = self._input_hash(workload_id, payload)
        cached = input_hash in self._cache
        return {
            "workload_id": workload_id,
            "input_hash": input_hash,
            "exact_reuse_candidate": cached,
            "decision_basis": "workload-scoped canonical exact-input hash",
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
        input_hash = self._input_hash(workload_id, payload)
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
        same_workload = baseline.workload_id == eden.workload_id
        same_input = baseline.input_hash == eden.input_hash
        equivalent = same_workload and same_input and baseline.output_hash == eden.output_hash
        return {
            "output_equivalence": "PASS" if equivalent else "FAIL",
            "same_workload": same_workload,
            "same_input": same_input,
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

        # Prime the exact-input cache with one conventional execution. The
        # following PROVE execution is then eligible for reuse.
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
                "scope": "single-host workload-scoped exact-input deterministic reuse demonstration",
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
