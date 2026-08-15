from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, Iterable, List, Optional


class StackError(ValueError):
    pass


def _check_fraction(name: str, value: float) -> float:
    value = float(value)
    if value < 0.0 or value >= 1.0:
        raise StackError(f"{name} must be in [0, 1)")
    return value


@dataclass(frozen=True)
class EfficiencyStage:
    name: str
    reduction_fraction: float
    evidence_ref: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.name:
            raise StackError("stage name is required")
        _check_fraction("reduction_fraction", self.reduction_fraction)

    @property
    def remaining_factor(self) -> float:
        return 1.0 - float(self.reduction_fraction)


@dataclass(frozen=True)
class MultiplicativeStackResult:
    baseline_resource: float
    resource_unit: str
    stage_count: int
    gross_remaining_fraction: float
    overhead_fraction: float
    net_remaining_fraction: float
    gross_resource_reduction: float
    net_resource_reduction: float
    net_resource_used: float
    quality_retention_factor: float
    quality_adjusted_efficiency_credit: float
    stages: List[Dict[str, object]]

    def as_dict(self) -> Dict[str, object]:
        return asdict(self)


class MultiplicativeEfficiencyStack:
    """Compose measured EDEN stage reductions without double counting by addition.

    For stage reductions r_i and integration overhead o:

        gross_remaining = Π_i (1 - r_i)
        net_remaining   = gross_remaining * (1 + o)
        net_saving      = baseline * max(0, 1 - net_remaining)

    A relative quality-retention factor q in [0, 1] then produces a separate
    quality-adjusted efficiency credit:

        credit = net_saving * q

    `credit` is an accounting score, not extra physical resource. It must not be
    represented as measured joules/bytes/compute saved unless the underlying
    stage reductions and baseline resource were physically measured in that unit.
    """

    def __init__(self, *, baseline_resource: float, resource_unit: str):
        if baseline_resource < 0:
            raise StackError("baseline_resource must be non-negative")
        if not resource_unit:
            raise StackError("resource_unit is required")
        self.baseline_resource = float(baseline_resource)
        self.resource_unit = resource_unit
        self._stages: List[EfficiencyStage] = []

    def add_stage(self, name: str, reduction_fraction: float, evidence_ref: Optional[str] = None) -> "MultiplicativeEfficiencyStack":
        self._stages.append(EfficiencyStage(name, reduction_fraction, evidence_ref))
        return self

    @property
    def stages(self) -> List[EfficiencyStage]:
        return list(self._stages)

    def evaluate(self, *, overhead_fraction: float = 0.0, quality_retention_factor: float = 1.0) -> MultiplicativeStackResult:
        overhead_fraction = float(overhead_fraction)
        if overhead_fraction < 0:
            raise StackError("overhead_fraction must be non-negative")
        quality_retention_factor = float(quality_retention_factor)
        if quality_retention_factor < 0 or quality_retention_factor > 1:
            raise StackError("quality_retention_factor must be in [0, 1]")

        gross_remaining = 1.0
        for stage in self._stages:
            gross_remaining *= stage.remaining_factor

        net_remaining = gross_remaining * (1.0 + overhead_fraction)
        gross_reduction = self.baseline_resource * (1.0 - gross_remaining)
        net_reduction = self.baseline_resource * max(0.0, 1.0 - net_remaining)
        net_used = self.baseline_resource - net_reduction
        quality_adjusted = net_reduction * quality_retention_factor

        return MultiplicativeStackResult(
            baseline_resource=self.baseline_resource,
            resource_unit=self.resource_unit,
            stage_count=len(self._stages),
            gross_remaining_fraction=gross_remaining,
            overhead_fraction=overhead_fraction,
            net_remaining_fraction=net_remaining,
            gross_resource_reduction=gross_reduction,
            net_resource_reduction=net_reduction,
            net_resource_used=net_used,
            quality_retention_factor=quality_retention_factor,
            quality_adjusted_efficiency_credit=quality_adjusted,
            stages=[
                {
                    "name": s.name,
                    "reduction_fraction": s.reduction_fraction,
                    "remaining_factor": s.remaining_factor,
                    "evidence_ref": s.evidence_ref,
                }
                for s in self._stages
            ],
        )
