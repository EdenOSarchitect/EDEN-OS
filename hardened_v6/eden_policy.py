from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from eden_evidence import EfficiencyEvidence, EvidenceLevel


@dataclass(frozen=True)
class ReclaimDecision:
    allowed: bool
    reason: str
    approved_bytes: int
    evidence_level: str
    tenant_approved: bool


def authorize_reclaim(
    evidence: EfficiencyEvidence,
    *,
    tenant_approved: bool,
    max_reclaim_bytes: Optional[int] = None,
) -> ReclaimDecision:
    """Fail-closed destructive reclaim authorization.

    EDEN efficiency accounting no longer requires a pre-frozen absolute quality
    threshold, but destructive reclaim remains stricter: relative quality must be
    measured and must be non-degrading versus the baseline.
    """
    if evidence.level < EvidenceLevel.EEA_2_QUALITY:
        return ReclaimDecision(False, "quality_evidence_required", 0, evidence.level.name, tenant_approved)
    if evidence.quality_passed is not True or evidence.quality_retention_factor is None or evidence.quality_retention_factor < 1.0:
        return ReclaimDecision(False, "non_degrading_quality_required_for_destructive_reclaim", 0, evidence.level.name, tenant_approved)
    if not tenant_approved:
        return ReclaimDecision(False, "tenant_approval_required", 0, evidence.level.name, False)
    approved = evidence.approved_reclaim_bytes
    if max_reclaim_bytes is not None:
        if max_reclaim_bytes < 0:
            return ReclaimDecision(False, "invalid_reclaim_limit", 0, evidence.level.name, True)
        approved = min(approved, max_reclaim_bytes)
    if approved <= 0:
        return ReclaimDecision(False, "nothing_approved_for_reclaim", 0, evidence.level.name, True)
    return ReclaimDecision(True, "relative_quality_and_tenant_approved", approved, evidence.level.name, True)
