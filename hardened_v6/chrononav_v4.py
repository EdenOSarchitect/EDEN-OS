from __future__ import annotations

import math
import statistics
import time
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Optional, Sequence

from eden_common import sha256_hex

PROTOCOL = "EDEN-OS/Chrononav-v4"
VERSION = "4.0"


def _mean(xs: Sequence[float]) -> float:
    return statistics.fmean(xs) if xs else 0.0


def _stdev(xs: Sequence[float]) -> float:
    return statistics.pstdev(xs) if len(xs) >= 2 else 0.0


def _cosine_distance(a: Sequence[float], b: Sequence[float]) -> Optional[float]:
    if not a or not b or len(a) != len(b):
        return None
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    if na == 0 or nb == 0:
        return None
    return 1.0 - max(-1.0, min(1.0, dot/(na*nb)))


@dataclass
class Observation:
    wall_time_unix_ns: int
    elapsed_monotonic_ns: int
    stage: str
    refinement_score: Optional[float] = None
    compression_ratio: Optional[float] = None
    entropy: Optional[float] = None
    token_count: Optional[int] = None
    byte_count: Optional[int] = None
    latency_ms: Optional[float] = None
    semantic_vector: Optional[List[float]] = None
    clock_uncertainty_ns: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class Chrononav:
    """Physical-elapsed-time trajectory telemetry with explicit uncertainty.

    EDEN coordinates remain dimensionless operational metrics. No relativistic
    correction is inferred from application timestamps.
    """

    def __init__(self, window: int = 128):
        if window < 3:
            raise ValueError("window must be >=3")
        self.window = window
        self._start_mono = time.monotonic_ns()
        self._obs: List[Observation] = []

    def observe(self, stage: str, *, clock_uncertainty_ns: Optional[int]=None, **kwargs: Any) -> Observation:
        mono = time.monotonic_ns()
        obs = Observation(
            wall_time_unix_ns=time.time_ns(),
            elapsed_monotonic_ns=mono-self._start_mono,
            stage=stage,
            refinement_score=kwargs.get("refinement_score"),
            compression_ratio=kwargs.get("compression_ratio"),
            entropy=kwargs.get("entropy"),
            token_count=kwargs.get("token_count"),
            byte_count=kwargs.get("byte_count"),
            latency_ms=kwargs.get("latency_ms"),
            semantic_vector=list(kwargs["semantic_vector"]) if kwargs.get("semantic_vector") is not None else None,
            clock_uncertainty_ns=clock_uncertainty_ns,
            metadata=dict(kwargs.get("metadata") or {}),
        )
        self._obs.append(obs)
        if len(self._obs) > self.window:
            self._obs = self._obs[-self.window:]
        return obs

    def observe_at(self, stage: str, elapsed_seconds: float, **kwargs: Any) -> Observation:
        if elapsed_seconds < 0:
            raise ValueError("elapsed_seconds must be non-negative")
        base_wall = self._obs[0].wall_time_unix_ns if self._obs else time.time_ns()
        obs = Observation(
            wall_time_unix_ns=base_wall + int(elapsed_seconds*1e9),
            elapsed_monotonic_ns=int(elapsed_seconds*1e9),
            stage=stage,
            refinement_score=kwargs.get("refinement_score"),
            compression_ratio=kwargs.get("compression_ratio"),
            entropy=kwargs.get("entropy"),
            token_count=kwargs.get("token_count"),
            byte_count=kwargs.get("byte_count"),
            latency_ms=kwargs.get("latency_ms"),
            semantic_vector=list(kwargs["semantic_vector"]) if kwargs.get("semantic_vector") is not None else None,
            clock_uncertainty_ns=kwargs.get("clock_uncertainty_ns"),
            metadata=dict(kwargs.get("metadata") or {}),
        )
        if self._obs and obs.elapsed_monotonic_ns <= self._obs[-1].elapsed_monotonic_ns:
            raise ValueError("elapsed time must be strictly increasing")
        self._obs.append(obs)
        return obs

    def _times(self) -> List[float]:
        return [o.elapsed_monotonic_ns/1e9 for o in self._obs]

    @staticmethod
    def _norm_change(a: Optional[float], b: Optional[float]) -> Optional[float]:
        if a is None or b is None:
            return None
        scale = max(abs(a), abs(b), 1e-9)
        return min(1.0, abs(b-a)/scale)

    def coordinate_series(self) -> Dict[str, List[float]]:
        if len(self._obs) < 2:
            raise ValueError("need at least two observations")
        alpha=[]; beta=[]; gamma=[]; tau=[]
        times=self._times()
        latencies=[]
        for i,o in enumerate(self._obs):
            if o.latency_ms is not None:
                latencies.append(float(o.latency_ms))
            if i == 0:
                a=0.0; comp_stress=0.0
            else:
                p=self._obs[i-1]
                candidates=[
                    self._norm_change(p.refinement_score,o.refinement_score),
                    self._norm_change(float(p.token_count) if p.token_count is not None else None, float(o.token_count) if o.token_count is not None else None),
                    self._norm_change(float(p.byte_count) if p.byte_count is not None else None, float(o.byte_count) if o.byte_count is not None else None),
                ]
                vals=[x for x in candidates if x is not None]
                a=_mean(vals)
                cs=[self._norm_change(p.compression_ratio,o.compression_ratio), self._norm_change(p.entropy,o.entropy)]
                comp_stress=_mean([x for x in cs if x is not None])
            alpha.append(a)
            if len(latencies) >= 2:
                m=max(abs(_mean(latencies)),1e-9)
                beta.append(max(0.0,1.0-min(1.0,_stdev(latencies)/m)))
            else:
                beta.append(1.0)
            gamma.append(max(0.0,1.0-comp_stress))
            tau.append(1.0-math.exp(-times[i]/60.0))
        return {"alpha":alpha,"beta":beta,"gamma":gamma,"tau":tau}

    @staticmethod
    def _diff(vals: Sequence[float], times: Sequence[float]) -> List[float]:
        out=[]
        for i in range(1,len(vals)):
            dt=times[i]-times[i-1]
            if dt<=0: raise ValueError("non-positive time delta")
            out.append((vals[i]-vals[i-1])/dt)
        return out

    def packet(self) -> Dict[str, Any]:
        times=self._times(); coords=self.coordinate_series()
        velocity={k:self._diff(v,times) for k,v in coords.items()}
        mids=[(times[i]+times[i+1])/2 for i in range(len(times)-1)]
        acceleration={k:self._diff(v,mids) if len(v)>=2 else [] for k,v in velocity.items()}
        semantic=[o.semantic_vector for o in self._obs if o.semantic_vector]
        semantic_shift=_cosine_distance(semantic[0],semantic[-1]) if len(semantic)>=2 else None
        uncertainty=[o.clock_uncertainty_ns for o in self._obs if o.clock_uncertainty_ns is not None]
        source={"observations":[asdict(o) for o in self._obs]}
        return {
            "protocol": PROTOCOL,
            "version": VERSION,
            "time_basis": {
                "elapsed_clock": "monotonic",
                "elapsed_unit": "second",
                "wall_clock": "unix_ns_for_correlation_only",
                "clock_uncertainty_ns_max": max(uncertainty) if uncertainty else None,
                "relativistic_correction_applied": False,
            },
            "coordinates_latest": {k:v[-1] for k,v in coords.items()},
            "trajectory": {
                "elapsed_seconds": times[-1],
                "velocity_1_per_s": {k:(v[-1] if v else None) for k,v in velocity.items()},
                "acceleration_1_per_s2": {k:(v[-1] if v else None) for k,v in acceleration.items()},
                "semantic_shift": semantic_shift,
                "stage_path": [o.stage for o in self._obs],
            },
            "integrity": {"source_hash": sha256_hex(source, domain="chrononav-v4")},
            "claims": {
                "physical_elapsed_time_measured": True,
                "coordinates_dimensionless": True,
                "physical_law_claimed": False,
                "time_dilation_inferred": False,
            },
        }
