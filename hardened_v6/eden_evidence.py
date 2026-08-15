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


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


@dataclass
class EfficiencyEvidence:
    tenant_id: str
    workload_id: str
    candidate_void_rate: float
    candidate_void_bytes: int
    observed_bytes: int
    level: EvidenceLevel = EvidenceLevel.EEA_0_CANDIDATE

    integrity_verified: bool = False

    # Quality is measured relative to the baseline rather than against a frozen threshold.
    quality_metric: Optional[str] = None
    quality_direction: Optional[str] = None  # 'gte': higher is better; 'lte': lower is better.
    quality_before: Optional[float] = None
    quality_after: Optional[float] = None
    quality_retention_factor: Optional[float] = None
    quality_passed: Optional[bool] = None  # True only when EDEN is non-degrading vs baseline.

    approved_reclaim_bytes: int = 0
    measured_resource_saving: Optional[float] = None
    measured_resource_unit: Optional[str] = None
    quality_adjusted_efficiency_credit: Optional[float] = None
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

    def verify_quality(
        self,
        *,
        metric: str,
        before: float,
        after: float,
        direction: str = "gte",
        approved_reclaim_bytes: int = 0,
    ) -> "EfficiencyEvidence":
        """Record relative quality without a pre-frozen absolute threshold.

        quality_retention_factor is capped at 1.0 so quality improvement does not
        magically amplify a resource saving. A degradation proportionally reduces
        quality-adjusted efficiency credit later.

        `quality_passed` means non-degrading relative to baseline and remains the
        fail-closed requirement for destructive reclaim authorization.
        """
        if not self.integrity_verified:
            raise EvidenceError("EEA-1 integrity must precede EEA-2 quality")
        if not metric:
            raise EvidenceError("quality metric is required")
        if direction not in {"gte", "lte"}:
            raise EvidenceError("quality direction must be 'gte' or 'lte'")
        if approved_reclaim_bytes < 0 or approved_reclaim_bytes > self.candidate_void_bytes:
            raise EvidenceError("approved reclaim must be within candidate void")

        before = float(before)
        after = float(after)
        self.quality_metric = metric
        self.quality_direction = direction
        self.quality_before = before
        self.quality_after = after

        if direction == "gte":
            if before < 0 or after < 0:
                raise EvidenceError("gte quality values must be non-negative")
            if before == 0:
                retention = 1.0 if after >= before else 0.0
            else:
                retention = _clamp01(after / before)
            non_degrading = after >= before
        else:
            if before < 0 or after < 0:
                raise EvidenceError("lte quality values must be non-negative")
            if after == 0:
                retention = 1.0
            elif before == 0:
                retention = 0.0
            else:
                retention = _clamp01(before / after)
            non_degrading = after <= before

        self.quality_retention_factor = retention
        self.quality_passed = non_degrading
        # Only non-degrading quality may authorize destructive reclaim.
        self.approved_reclaim_bytes = approved_reclaim_bytes if non_degrading else 0
        self.level = max(self.level, EvidenceLevel.EEA_2_QUALITY)
        return self

    def verify_efficiency(self, *, saving: float, unit: str) -> "EfficiencyEvidence":
        if self.level < EvidenceLevel.EEA_2_QUALITY or self.quality_retention_factor is None:
            raise EvidenceError("EEA-2 relative quality measurement must precede EEA-3 efficiency")
        if saving < 0:
            raise EvidenceError("measured saving must be non-negative")
        if not unit:
            raise EvidenceError("measured resource unit is required")
        self.measured_resource_saving = float(saving)
        self.measured_resource_unit = unit
        self.quality_adjusted_efficiency_credit = float(saving) * self.quality_retention_factor
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
            "quality_threshold_pre_registration_required": False,
            "quality_is_measured_relative_to_baseline": True,
            "quality_degradation_discounts_efficiency_credit": True,
            "destructive_reclaim_requires_non_degrading_quality": True,
            "economic_value_requires_measured_saving": True,
        }
        return d
