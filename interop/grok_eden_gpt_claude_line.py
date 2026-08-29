from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from dataclasses import dataclass, asdict
from typing import Any, Dict, Mapping, Optional


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(value: object, domain: str) -> str:
    h = hashlib.sha256()
    h.update(domain.encode("utf-8"))
    h.update(b"\x00")
    h.update(canonical_json(value))
    return h.hexdigest()


@dataclass(frozen=True)
class StageReceipt:
    stage: str
    mode: str
    input_hash_sha256: str
    output_hash_sha256: str
    created_at_unix_ms: int
    external_call: bool
    provider: Optional[str] = None
    model: Optional[str] = None


class InteropError(ValueError):
    pass


def build_sovereign_packet(payload: Mapping[str, Any], *, source: str = "grok", tenant_id: str = "eden-sovereign") -> Dict[str, Any]:
    body = {
        "schema": "EDEN-Sovereign-Interop-v1",
        "tenant_id": tenant_id,
        "source": source,
        "payload": dict(payload),
        "created_at_unix_ms": int(time.time() * 1000),
        "claims": {
            "external_call_performed": False,
            "source_payload_is_not_provider_attestation": True,
        },
    }
    body["packet_hash_sha256"] = sha256_hex(body, "eden-sovereign-packet-v1")
    return body


def build_gpt_packet(eden_packet: Mapping[str, Any], *, instruction: str = "Review the EDEN packet without upgrading unsupported claims.") -> Dict[str, Any]:
    """Builds a GPT-stage packet with NO external API call.

    This keeps the line reproducible and sovereign by default. The packet can
    optionally be sent to OpenAI only via call_gpt(), which must be explicitly requested.
    """
    body = {
        "schema": "EDEN-GPT-Interop-v1",
        "upstream": "EDEN",
        "instruction": instruction,
        "eden_packet_hash_sha256": eden_packet.get("packet_hash_sha256") or sha256_hex(eden_packet, "eden-packet-ref-v1"),
        "eden_packet": dict(eden_packet),
        "policy": {
            "preserve_truth_boundaries": True,
            "do_not_upgrade_synthetic_to_live": True,
            "do_not_upgrade_local_to_independent": True,
            "do_not_claim_external_provider_execution_without_receipt": True,
        },
        "created_at_unix_ms": int(time.time() * 1000),
    }
    body["packet_hash_sha256"] = sha256_hex(body, "eden-gpt-packet-v1")
    return body


def call_gpt(gpt_packet: Mapping[str, Any], *, model: str = "gpt-5", store: bool = False) -> Dict[str, Any]:
    """Optional live OpenAI Responses API call.

    Requires OPENAI_API_KEY and the official `openai` Python package. This is
    intentionally separate from packet building so normal runs make no network call.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise InteropError("OPENAI_API_KEY is not set")
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise InteropError("install the official openai package to enable --call-gpt") from exc

    client = OpenAI()
    input_hash = sha256_hex(gpt_packet, "eden-gpt-live-input-v1")
    response = client.responses.create(
        model=model,
        input=json.dumps(gpt_packet, sort_keys=True),
        store=store,
    )
    output = {
        "provider": "OpenAI",
        "model": model,
        "response_id": response.id,
        "output_text": response.output_text,
    }
    receipt = StageReceipt(
        stage="GPT",
        mode="LIVE_API",
        input_hash_sha256=input_hash,
        output_hash_sha256=sha256_hex(output, "eden-gpt-live-output-v1"),
        created_at_unix_ms=int(time.time() * 1000),
        external_call=True,
        provider="OpenAI",
        model=model,
    )
    return {"output": output, "receipt": asdict(receipt)}


def build_claude_packet(gpt_packet: Mapping[str, Any], *, gpt_live_result: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
    """Build the downstream Claude handoff. No Anthropic call is made."""
    body = {
        "schema": "EDEN-Claude-Interop-v1",
        "upstream": "GPT",
        "gpt_packet_hash_sha256": gpt_packet.get("packet_hash_sha256") or sha256_hex(gpt_packet, "eden-gpt-ref-v1"),
        "gpt_packet": dict(gpt_packet),
        "gpt_live_result": dict(gpt_live_result) if gpt_live_result else None,
        "truth_boundary": {
            "claude_external_call_performed": False,
            "gpt_external_call_performed": bool(gpt_live_result),
        },
        "created_at_unix_ms": int(time.time() * 1000),
    }
    body["packet_hash_sha256"] = sha256_hex(body, "eden-claude-packet-v1")
    return body


def build_full_line(payload: Mapping[str, Any], *, call_openai: bool = False, model: str = "gpt-5") -> Dict[str, Any]:
    sovereign = build_sovereign_packet(payload, source="grok")
    gpt = build_gpt_packet(sovereign)
    gpt_live = call_gpt(gpt, model=model, store=False) if call_openai else None
    claude = build_claude_packet(gpt, gpt_live_result=gpt_live)
    return {
        "schema": "EDEN-Grok-EDEN-GPT-Claude-Line-v1",
        "route": ["GROK", "EDEN", "GPT", "CLAUDE"],
        "sovereign_packet": sovereign,
        "gpt_packet": gpt,
        "gpt_live_result": gpt_live,
        "claude_packet": claude,
        "external_calls": {"gpt": bool(gpt_live), "claude": False},
        "line_hash_sha256": sha256_hex({"sovereign": sovereign["packet_hash_sha256"], "gpt": gpt["packet_hash_sha256"], "claude": claude["packet_hash_sha256"]}, "eden-full-line-v1"),
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Build Grok -> EDEN -> GPT -> Claude sovereign interop packets")
    p.add_argument("--input", help="JSON file containing Grok/upstream payload")
    p.add_argument("--output", default="grok_eden_gpt_claude_packet.json")
    p.add_argument("--call-gpt", action="store_true", help="Explicitly make an OpenAI Responses API call")
    p.add_argument("--model", default="gpt-5")
    args = p.parse_args()

    payload: Dict[str, Any]
    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = {"message": "packet-build-only", "note": "No external Grok or Claude call performed."}

    result = build_full_line(payload, call_openai=args.call_gpt, model=args.model)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, sort_keys=True)
    print(json.dumps({
        "route": result["route"],
        "external_calls": result["external_calls"],
        "line_hash_sha256": result["line_hash_sha256"],
        "output": args.output,
    }, indent=2))


if __name__ == "__main__":
    main()
