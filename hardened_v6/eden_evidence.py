from __future__ import annotations

from dataclasses import dataclass, asdict
from enum import IntEnum
from typing import Any, Dict, Optional


class EvidenceLevel(IntEnum):
    EEA_0_CANDIDATE = 0
    EEA_1_INTEGRITY = 1
    EEA_2_QUALITY = 2
    EEA_3_EFFICIENCY = 3
    EEA_4_ECONOMIC = 4
    EEA_5_INDEPENDENT = 5


class EvidenceError(ValueError):
    pass


@dataclass
class EfficiencyEvidence:
    tenant_id: str
    workload_id: str
    candidate_void_rate: float
    candidate_void_bytes: int
    observed_bytes: int
    level: EvidenceLevel = EvidenceLevel.EEA_0_CANDIDATE

    integrity_verified: bool = False
    quality_passed: Optional[bool] = None
    quality_metric: Optional[str] = None
    quality_before: Optional[float] = None
    quality_after: Optional[float] = None
    quality_threshold: Optional[float] = None

    approved_reclaim_bytes: int = 0
    measured_resource_saving: Optional[float] = None
    measured_resource_unit: Optional[str] = None
    verified_economic_saving: Optional[float] = None
    currency: Optional[str] = None
    independent_validator: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.tenant_id or not self.workload_id:
            raise EvidenceError("tenant_id and workload_id are required")
        if self.observed_bytes < 0 or self.candidate_void_bytes < 0:
            raise EvidenceError("byte counts must be non-negative")
        if self.candidate_void_bytes > self.observed_bytes:
            raise EvidenceError("candidate void cannot exceed observed bytes")
        expected = self.candidate_void_bytes / self.observed_bytes if self.observed_bytes else 0.0
        if abs(expected - self.candidate_void_rate) > 1e-9:
            raise EvidenceError("candidate_void_rate must equal candidate_void_bytes/observed_bytes")

    def verify_integrity(self) -> "EfficiencyEvidence":
        self.integrity_verified = True
        self.level = max(self.level, EvidenceLevel.EEA_1_INTEGRITY)
        return self

    def verify_quality(self, *, metric: str, before: float, after: float, threshold: float, passed: bool, approved_reclaim_bytes: int) -> "EfficiencyEvidence":
        if not self.integrity_verified:
            raise EvidenceError("EEA-1 integrity must precede EEA-2 quality")
        if approved_reclaim_bytes < 0 or approved_reclaim_bytes > self.candidate_void_bytes:
            raise EvidenceError("approved reclaim must be within candidate void")
        if not passed:
            raise EvidenceError("failed quality checks cannot be promoted to EEA-2")
        self.quality_metric = metric
        self.quality_before = float(before)
        self.quality_after = float(after)
        self.quality_threshold = float(threshold)
        self.quality_passed = True
        self.approved_reclaim_bytes = approved_reclaim_bytes
        self.level = max(self.level, EvidenceLevel.EEA_2_QUALITY)
        return self

    def verify_efficiency(self, *, saving: float, unit: str) -> "EfficiencyEvidence":
        if self.level < EvidenceLevel.EEA_2_QUALITY:
            raise EvidenceError("EEA-2 quality must precede EEA-3 efficiency")
        if saving < 0:
            raise EvidenceError("measured saving must be non-negative")
        self.measured_resource_saving = float(saving)
        self.measured_resource_unit = unit
        self.level = max(self.level, EvidenceLevel.EEA_3_EFFICIENCY)
        return self

    def verify_economic(self, *, amount: float, currency: str) -> "EfficiencyEvidence":
        if self.level < EvidenceLevel.EEA_3_EFFICIENCY:
            raise EvidenceError("EEA-3 efficiency must precede EEA-4 economic")
        if amount < 0 or not currency:
            raise EvidenceError("economic amount must be non-negative with currency")
        self.verified_economic_saving = float(amount)
        self.currency = currency.upper()
        self.level = max(self.level, EvidenceLevel.EEA_4_ECONOMIC)
        return self

    def independently_validate(self, *, validator: str) -> "EfficiencyEvidence":
        if self.level < EvidenceLevel.EEA_4_ECONOMIC:
            raise EvidenceError("EEA-4 economic evidence must precede EEA-5")
        if not validator:
            raise EvidenceError("validator identity is required")
        self.independent_validator = validator
        self.level = EvidenceLevel.EEA_5_INDEPENDENT
        return self

    def economic_license_share(self, rate: float = 0.40) -> float:
        if self.level < EvidenceLevel.EEA_4_ECONOMIC:
            raise EvidenceError("licensing may only be calculated from EEA-4+ economic evidence")
        if rate < 0 or rate > 1:
            raise EvidenceError("license rate must be between 0 and 1")
        return (self.verified_economic_saving or 0.0) * rate

    def as_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["level"] = self.level.name
        d["claims"] = {
            "candidate_void_is_not_saving": True,
            "quality_required_before_reclaim": True,
            "economic_value_requires_measured_saving": True,
        }
        return d
