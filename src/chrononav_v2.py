from __future__ import annotations

import hashlib, json, math, statistics, time
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Mapping, Optional, Sequence

CHRONONAV_PROTOCOL = "EDEN-OS/Chrononav-v2"
CHRONONAV_VERSION = "2.0"

def _canon(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def _sha256(obj: Any) -> str:
    raw = obj if isinstance(obj, (bytes, bytearray)) else _canon(obj)
    return hashlib.sha256(raw).hexdigest()

def _safe_mean(values: Sequence[float]) -> float:
    return statistics.fmean(values) if values else 0.0

def _safe_stdev(values: Sequence[float]) -> float:
    return 0.0 if len(values) < 2 else statistics.pstdev(values)

def _cosine_distance(a, b):
    if not a or not b or len(a) != len(b): return None
    dot=sum(x*y for x,y in zip(a,b)); na=math.sqrt(sum(x*x for x in a)); nb=math.sqrt(sum(y*y for y in b))
    if na == 0 or nb == 0: return None
    return 1.0-max(-1.0,min(1.0,dot/(na*nb)))

@dataclass
class ChrononavObservation:
    ts_unix_ms:int; stage:str; token_count:Optional[int]=None; byte_count:Optional[int]=None
    latency_ms:Optional[float]=None; compression_ratio:Optional[float]=None; entropy:Optional[float]=None
    semantic_vector:Optional[List[float]]=None; refinement_score:Optional[float]=None
    metadata:Dict[str,Any]=field(default_factory=dict)

@dataclass
class ChrononavState:
    alpha:float; beta:float; gamma:float; tau:float
    temporal_velocity:float; temporal_acceleration:float; curvature:float
    drift_score:float; stability_score:float; compression_stress:float; semantic_shift:Optional[float]
    observation_count:int; duration_ms:int; stage_path:List[str]; source_hash:str

class ChrononavTracker:
    """EDEN-derived temporal/refinement telemetry; coordinates are not fundamental physical units."""
    def __init__(self, *, window=32):
        if window < 2: raise ValueError("window must be >= 2")
        self.window=window; self._obs=[]
    @property
    def observations(self): return list(self._obs)
    def observe(self, stage, *, ts_unix_ms=None, token_count=None, byte_count=None, latency_ms=None,
                compression_ratio=None, entropy=None, semantic_vector=None, refinement_score=None, metadata=None):
        o=ChrononavObservation(int(ts_unix_ms if ts_unix_ms is not None else time.time()*1000),stage,token_count,byte_count,
            latency_ms,compression_ratio,entropy,list(semantic_vector) if semantic_vector is not None else None,
            refinement_score,dict(metadata or {}))
        self._obs.append(o); self._obs=self._obs[-self.window:]; return o
    def _series(self,a): return [float(getattr(o,a)) for o in self._obs if isinstance(getattr(o,a),(int,float))]
    def _deltas(self,v): return [v[i]-v[i-1] for i in range(1,len(v))]
    def _normalized_change(self,v):
        if len(v)<2:return 0.0
        return min(1.0,_safe_mean([abs(x) for x in self._deltas(v)])/max(abs(_safe_mean(v)),1e-9))
    def compute(self):
        if not self._obs: raise ValueError("Chrononav has no observations")
        times=[o.ts_unix_ms for o in self._obs]; duration=max(times)-min(times)
        refine=self._series("refinement_score"); latency=self._series("latency_ms"); comp=self._series("compression_ratio")
        entropy=self._series("entropy"); tokens=self._series("token_count"); bytes_=self._series("byte_count")
        candidates=[self._normalized_change(s) for s in (refine,tokens,bytes_) if len(s)>=2]
        alpha=min(1.0,_safe_mean(candidates)) if candidates else 0.0
        cv=min(1.0,_safe_stdev(latency)/max(abs(_safe_mean(latency)),1e-9)) if latency else 0.0; beta=max(0.0,1.0-cv)
        stress=[]
        if len(comp)>=2: stress.append(self._normalized_change(comp))
        if len(entropy)>=2: stress.append(self._normalized_change(entropy))
        compression_stress=min(1.0,_safe_mean(stress)) if stress else 0.0; gamma=max(0.0,1.0-compression_stress)
        sv=[o.semantic_vector for o in self._obs if o.semantic_vector]; semantic_shift=_cosine_distance(sv[0],sv[-1]) if len(sv)>=2 else None
        base=refine if len(refine)>=2 else (tokens if len(tokens)>=2 else bytes_); velocity=acceleration=curvature=0.0
        if len(base)>=2:
            d=self._deltas(base); velocity=_safe_mean(d)
            if len(d)>=2:
                acc=self._deltas(d); acceleration=_safe_mean(acc); denom=(1.0+velocity*velocity)**1.5; curvature=abs(acceleration)/denom if denom else 0.0
        parts=[1.0-beta,compression_stress]+([min(1.0,max(0.0,semantic_shift))] if semantic_shift is not None else [])
        drift=min(1.0,_safe_mean(parts)); stability=max(0.0,1.0-drift); tau=1.0-math.exp(-(duration/1000.0)*max(alpha,0.01)/60.0)
        payload={"observations":[asdict(o) for o in self._obs],"window":self.window}
        return ChrononavState(*[round(x,8) for x in (alpha,beta,gamma,tau,velocity,acceleration,curvature,drift,stability,compression_stress)],
            None if semantic_shift is None else round(semantic_shift,8),len(self._obs),duration,[o.stage for o in self._obs],_sha256(payload))
    def packet_fragment(self):
        s=self.compute()
        return {"protocol":CHRONONAV_PROTOCOL,"version":CHRONONAV_VERSION,
          "coordinates":{"alpha":s.alpha,"beta":s.beta,"gamma":s.gamma,"tau":s.tau},
          "temporal":{"velocity":s.temporal_velocity,"acceleration":s.temporal_acceleration,"curvature":s.curvature,"duration_ms":s.duration_ms},
          "telemetry":{"drift_score":s.drift_score,"stability_score":s.stability_score,"compression_stress":s.compression_stress,"semantic_shift":s.semantic_shift},
          "observations":{"count":s.observation_count,"stage_path":s.stage_path},"integrity":{"source_hash":s.source_hash},
          "claims":{"eden_derived_metric":True,"physical_time_geometry_claimed":False,"scientifically_validated_unit_claimed":False}}
