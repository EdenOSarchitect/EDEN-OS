from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

PROTOCOL_FAMILY = "EDEN-OS"


def canonical_json(value: Any) -> bytes:
    """Deterministic JSON encoding for EDEN protocol objects.

    NOTE: This is EDEN canonical JSON, not a claim of RFC 8785 conformance.
    Protocol-version changes are required if this encoding changes.
    """
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def domain_bytes(domain: str, value: Any) -> bytes:
    return (
        b"EDEN\x00"
        + domain.encode("utf-8")
        + b"\x00"
        + canonical_json(value)
    )


def sha256_hex(value: Any, *, domain: str = "generic") -> str:
    return hashlib.sha256(domain_bytes(domain, value)).hexdigest()


def b64e(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def b64d(text: str) -> bytes:
    return base64.b64decode(text.encode("ascii"), validate=True)
