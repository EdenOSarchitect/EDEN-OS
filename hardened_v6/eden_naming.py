"""Canonical EDEN unit names.

RCU replaces the earlier code-level RSU = kept_bytes / TiB naming.
RSU is reserved for the conceptual Refinement Stability Unit.
"""

TIB = 1024 ** 4


def rcu_from_kept_bytes(kept_bytes: int) -> float:
    if kept_bytes < 0:
        raise ValueError("kept_bytes must be non-negative")
    return kept_bytes / TIB


UNIT_REGISTRY = {
    "RCU": {
        "name": "Refinement Capacity Unit",
        "definition": "kept_bytes / TiB",
        "monetary": False,
    },
    "RSU": {
        "name": "Refinement Stability Unit",
        "definition": "EDEN stability metric; specification pending empirical calibration",
        "monetary": False,
    },
    "CRV": {
        "name": "Cost of Refinement Value",
        "definition": "resource/cost attribution construct requiring external prices for monetary output",
        "monetary": "only when externally priced inputs are present",
    },
}
