from __future__ import annotations

from dataclasses import dataclass, asdict
from enum import IntEnum
from typing import Any, Dict, Optional
import time


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

    # Quality gate must be declared/frozen before measurement starts.
    quality_gate_frozen: bool = False
    quality_metric: Optional[str] = None
    quality_threshold: Optional[float] = None
    quality_direction: Optional[str] = None  # 'gte' means higher is better; 'lte' means lower is better.
    quality_gate_frozen_at_unix_ms: Optional[int] = None
    measurement_started: bool = False
    measurement_started_at_unix_ms: Optional[int] = None

    quality_passed: Optional[bool] = None
    quality_before: Optional[float] = None
    quality_after: Optional[float] = None

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

    def freeze_quality_gate(self, *, metric: str, threshold: float, direction: str = "gte") -> "EfficiencyEvidence":
        """Pre-register the benchmark quality criterion before measurement begins.

        Once frozen, metric/threshold/direction cannot be changed on this evidence object.
        """
        if self.measurement_started:
            raise EvidenceError("quality gate must be frozen before measurement starts")
        if self.quality_gate_frozen:
            raise EvidenceError("quality gate is already frozen")
        if not metric:
            raise EvidenceError("quality metric is required")
        if direction not in {"gte", "lte"}:
            raise EvidenceError("quality direction must be 'gte' or 'lte'")
        self.quality_metric = metric
        self.quality_threshold = float(threshold)
        self.quality_direction = direction
        self.quality_gate_frozen = True
        self.quality_gate_frozen_at_unix_ms = int(time.time() * 1000)
        return self

    def start_measurement(self) -> "EfficiencyEvidence":
        """Mark the benchmark as started; requires a pre-frozen quality gate."""
        if not self.quality_gate_frozen:
            raise EvidenceError("freeze quality gate before measurement starts")
        if self.measurement_started:
            raise EvidenceError("measurement already started")
        self.measurement_started = True
        self.measurement_started_at_unix_ms = int(time.time() * 1000)
        return self

    def _quality_meets_gate(self, value: float) -> bool:
        if not self.quality_gate_frozen or self.quality_threshold is None or self.quality_direction is None:
            raise EvidenceError("quality gate is not frozen")
        if self.quality_direction == "gte":
            return float(value) >= self.quality_threshold
        return float(value) <= self.quality_threshold

    def verify_integrity(self) -> "EfficiencyEvidence":
        self.integrity_verified = True
        self.level = max(self.level, EvidenceLevel.EEA_1_INTEGRITY)
        return self

    def verify_quality(self, *, before: float, after: float, approved_reclaim_bytes: int) -> "EfficiencyEvidence":
        """Promote to EEA-2 only when BOTH baseline and EDEN outputs meet the frozen gate."""
        if not self.measurement_started:
            raise EvidenceError("measurement must be started after freezing quality gate")
        if not self.integrity_verified:
            raise EvidenceError("EEA-1 integrity must precede EEA-2 quality")
        if approved_reclaim_bytes < 0 or approved_reclaim_bytes > self.candidate_void_bytes:
            raise EvidenceError("approved reclaim must be within candidate void")

        self.quality_before = float(before)
        self.quality_after = float(after)
        baseline_ok = self._quality_meets_gate(before)
        eden_ok = self._quality_meets_gate(after)
        self.quality_passed = baseline_ok and eden_ok
        if not self.quality_passed:
            self.approved_reclaim_bytes = 0
            raise EvidenceError("quality gate failed; efficiency credit is zero and EEA-2 promotion denied")

        self.approved_reclaim_bytes = approved_reclaim_bytes
        self.level = max(self.level, EvidenceLevel.EEA_2_QUALITY)
        return self

    def verify_efficiency(self, *, saving: float, unit: str) -> "EfficiencyEvidence":
        if self.level < EvidenceLevel.EEA_2_QUALITY or self.quality_passed is not True:
            raise EvidenceError("quality gate must pass before EEA-3 efficiency")
        if saving < 0:
            raise EvidenceError("measured saving must be non-negative")
        if not unit:
            raise EvidenceError("measured resource unit is required")
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
            "quality_gate_pre_registered": self.quality_gate_frozen,
            "baseline_and_eden_must_pass_quality": True,
            "quality_failure_means_zero_efficiency_credit": True,
            "quality_required_before_reclaim": True,
            "economic_value_requires_measured_saving": True,
        }
        return d
