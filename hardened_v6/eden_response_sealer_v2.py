from __future__ import annotations

import copy
import hashlib
import hmac
import time
import uuid
from typing import Any, Mapping, Optional

from eden_common import canonical_json, sha256_hex

PROTOCOL = "EDEN-OS/Response-Seal-v2"
VERSION = "2.0"


class ResponseSealError(ValueError):
    pass


def _extract_text(response: Mapping[str, Any]) -> str:
    if isinstance(response.get("output_text"), str):
        return response["output_text"]
    output = response.get("output")
    if isinstance(output, list):
        parts = []
        for item in output:
            if not isinstance(item, Mapping):
                continue
            content = item.get("content")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, Mapping) and isinstance(block.get("text"), str):
                        parts.append(block["text"])
        if parts:
            return "".join(parts)
    choices = response.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, Mapping):
            message = first.get("message")
            if isinstance(message, Mapping) and isinstance(message.get("content"), str):
                return message["content"]
            if isinstance(first.get("text"), str):
                return first["text"]
    raise ResponseSealError("response contains no supported text output")


def build_response_packet(
    response: Mapping[str, Any],
    *,
    tenant_id: str,
    parent_packet_id: str,
    request_packet_hash: str,
    provider: str,
    model: Optional[str] = None,
    metadata: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    if not isinstance(response, Mapping):
        raise ResponseSealError("response must be a mapping")
    if not tenant_id or not parent_packet_id or not request_packet_hash or not provider:
        raise ResponseSealError("tenant_id, parent_packet_id, request_packet_hash and provider are required")
    text = _extract_text(response)
    now_ms = int(time.time() * 1000)
    packet = {
        "protocol": PROTOCOL,
        "version": VERSION,
        "packet_id": f"erp_{uuid.uuid4().hex}",
        "event_type": "MODEL_RESPONSE",
        "tenant_id": tenant_id,
        "parent_packet_id": parent_packet_id,
        "request_packet_hash": request_packet_hash,
        "provider": provider,
        "model": model or response.get("model"),
        "created_at_unix_ms": now_ms,
        "nonce": f"rspnonce_{uuid.uuid4().hex}",
        "response": {
            "text": text,
            "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "payload": copy.deepcopy(dict(response)),
        },
        "usage": dict(response.get("usage") or {}) if isinstance(response.get("usage"), Mapping) else {},
        "metadata": dict(metadata or {}),
        "claims": {
            "external_overlay": True,
            "hidden_runtime_state_observed": False,
            "provider_internal_attestation": False,
        },
    }
    return packet


def seal_packet(packet: Mapping[str, Any], *, secret: Optional[str] = None) -> dict[str, Any]:
    body = copy.deepcopy(dict(packet))
    body.pop("seal", None)
    digest = sha256_hex(body, domain="response-packet-v2")
    seal = {
        "algorithm": "SHA-256",
        "domain": "response-packet-v2",
        "content_hash": digest,
        "sealed_at_unix_ms": int(time.time() * 1000),
    }
    if secret is not None:
        if not secret:
            raise ResponseSealError("secret must not be empty")
        authenticated_seal = dict(seal)
        mac = hmac.new(
            secret.encode("utf-8"),
            b"EDEN-HMAC\x00response-seal-v2\x00" + canonical_json(authenticated_seal),
            hashlib.sha256,
        ).hexdigest()
        seal.update({"auth": "HMAC-SHA256", "hmac_sha256": mac})
    return {"body": body, "seal": seal}


def verify_sealed_packet(sealed: Mapping[str, Any], *, secret: Optional[str] = None) -> dict[str, Any]:
    if not isinstance(sealed, Mapping):
        raise ResponseSealError("sealed packet must be a mapping")
    body = sealed.get("body")
    seal = sealed.get("seal")
    if not isinstance(body, Mapping) or not isinstance(seal, Mapping):
        return {"ok": False, "error": "invalid_shape"}
    expected = seal.get("content_hash")
    actual = sha256_hex(dict(body), domain="response-packet-v2")
    hash_ok = isinstance(expected, str) and hmac.compare_digest(expected, actual)
    hmac_present = isinstance(seal.get("hmac_sha256"), str)
    hmac_ok = None
    if hmac_present:
        if not secret:
            hmac_ok = False
        else:
            authenticated_seal = {
                "algorithm": seal.get("algorithm"),
                "domain": seal.get("domain"),
                "content_hash": seal.get("content_hash"),
                "sealed_at_unix_ms": seal.get("sealed_at_unix_ms"),
            }
            expected_mac = hmac.new(
                secret.encode("utf-8"),
                b"EDEN-HMAC\x00response-seal-v2\x00" + canonical_json(authenticated_seal),
                hashlib.sha256,
            ).hexdigest()
            hmac_ok = hmac.compare_digest(expected_mac, seal["hmac_sha256"])
    return {
        "ok": hash_ok and hmac_ok is not False,
        "content_hash_ok": hash_ok,
        "hmac_present": hmac_present,
        "hmac_ok": hmac_ok,
        "packet_id": body.get("packet_id"),
        "tenant_id": body.get("tenant_id"),
    }
