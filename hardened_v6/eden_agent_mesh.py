from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, FrozenSet, Iterable, Mapping, Optional, Tuple

from eden_evidence import EvidenceLevel


class MeshSecurityError(ValueError):
    pass


def _canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def _digest(value: object, domain: str) -> str:
    h = hashlib.sha256()
    h.update(domain.encode())
    h.update(b"\x00")
    h.update(_canonical(value))
    return h.hexdigest()


@dataclass(frozen=True)
class CRVPolicy:
    """Constrained Resource Verification policy propagated to every mesh edge.

    CRV is deliberately a policy/accounting primitive here, not cryptography.
    It constrains resource use and requires evidence before higher-impact actions.
    """
    max_input_bytes: int
    max_output_bytes: int
    max_compute_units: float
    max_wall_ms: int
    min_evidence_level: EvidenceLevel = EvidenceLevel.EEA_1_INTEGRITY
    require_quality_for_destructive_action: bool = True

    def __post_init__(self) -> None:
        if min(self.max_input_bytes, self.max_output_bytes, self.max_wall_ms) < 0:
            raise MeshSecurityError("CRV integer limits must be non-negative")
        if self.max_compute_units < 0:
            raise MeshSecurityError("CRV compute limit must be non-negative")

    def child(self, *, input_bytes: int, output_bytes: int, compute_units: float, wall_ms: int) -> "CRVPolicy":
        if input_bytes > self.max_input_bytes or output_bytes > self.max_output_bytes:
            raise MeshSecurityError("child CRV exceeds parent byte budget")
        if compute_units > self.max_compute_units or wall_ms > self.max_wall_ms:
            raise MeshSecurityError("child CRV exceeds parent compute/time budget")
        return CRVPolicy(input_bytes, output_bytes, compute_units, wall_ms, self.min_evidence_level, self.require_quality_for_destructive_action)


@dataclass(frozen=True)
class AgentIdentity:
    agent_id: str
    tenant_id: str
    parent_id: Optional[str]
    capabilities: FrozenSet[str]
    depth: int


@dataclass(frozen=True)
class MeshEnvelope:
    message_id: str
    tenant_id: str
    sender_id: str
    recipient_id: str
    capability: str
    nonce: str
    issued_at_ms: int
    expires_at_ms: int
    evidence_level: int
    crv: CRVPolicy
    payload_hash: str
    parent_state_hash: str
    mac: str = ""

    def unsigned(self) -> Mapping[str, object]:
        return {
            "message_id": self.message_id,
            "tenant_id": self.tenant_id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "capability": self.capability,
            "nonce": self.nonce,
            "issued_at_ms": self.issued_at_ms,
            "expires_at_ms": self.expires_at_ms,
            "evidence_level": self.evidence_level,
            "crv": {
                "max_input_bytes": self.crv.max_input_bytes,
                "max_output_bytes": self.crv.max_output_bytes,
                "max_compute_units": self.crv.max_compute_units,
                "max_wall_ms": self.crv.max_wall_ms,
                "min_evidence_level": int(self.crv.min_evidence_level),
                "require_quality_for_destructive_action": self.crv.require_quality_for_destructive_action,
            },
            "payload_hash": self.payload_hash,
            "parent_state_hash": self.parent_state_hash,
        }


class AgentMesh:
    """Hierarchical EDEN agent mesh.

    Security invariants:
      * default deny capability model
      * tenant isolation
      * child capability/budget subset of parent
      * bounded tree depth and fanout
      * authenticated envelopes
      * nonce replay rejection
      * expiry checks
      * evidence-level gate
      * CRV checked on every hop
      * state commitments chain mesh mutations
    """

    def __init__(self, *, root_tenant: str, root_secret: bytes, root_crv: CRVPolicy, max_depth: int = 12, max_children: int = 1024):
        if not root_tenant or len(root_secret) < 32:
            raise MeshSecurityError("tenant and >=256-bit root secret required")
        if max_depth < 1 or max_children < 1:
            raise MeshSecurityError("invalid topology bounds")
        self._secret = root_secret
        self.max_depth = max_depth
        self.max_children = max_children
        self.nodes: Dict[str, AgentIdentity] = {}
        self.crv: Dict[str, CRVPolicy] = {}
        self.children: Dict[str, set[str]] = {}
        self.used_nonces: set[Tuple[str, str]] = set()
        self.state_hash = _digest({"tenant": root_tenant, "genesis": True}, "eden-agent-mesh-genesis-v1")
        root = AgentIdentity("eden-root", root_tenant, None, frozenset({"mesh.delegate", "mesh.observe", "evidence.write"}), 0)
        self.nodes[root.agent_id] = root
        self.crv[root.agent_id] = root_crv
        self.children[root.agent_id] = set()

    def _commit(self, event: Mapping[str, object]) -> str:
        self.state_hash = _digest({"previous": self.state_hash, "event": dict(event)}, "eden-agent-mesh-state-v1")
        return self.state_hash

    def add_agent(self, *, parent_id: str, agent_id: str, capabilities: Iterable[str], crv: CRVPolicy) -> AgentIdentity:
        if agent_id in self.nodes or not agent_id:
            raise MeshSecurityError("agent id invalid or already exists")
        parent = self.nodes.get(parent_id)
        if parent is None:
            raise MeshSecurityError("unknown parent")
        if parent.depth + 1 > self.max_depth:
            raise MeshSecurityError("maximum mesh depth exceeded")
        if len(self.children[parent_id]) >= self.max_children:
            raise MeshSecurityError("maximum parent fanout exceeded")
        caps = frozenset(capabilities)
        if not caps.issubset(parent.capabilities):
            raise MeshSecurityError("child capabilities must be subset of parent")
        pcrv = self.crv[parent_id]
        # Validate the complete child budget against the parent ceiling.
        pcrv.child(input_bytes=crv.max_input_bytes, output_bytes=crv.max_output_bytes, compute_units=crv.max_compute_units, wall_ms=crv.max_wall_ms)
        if crv.min_evidence_level < pcrv.min_evidence_level:
            raise MeshSecurityError("child cannot weaken parent evidence requirement")
        node = AgentIdentity(agent_id, parent.tenant_id, parent_id, caps, parent.depth + 1)
        self.nodes[agent_id] = node
        self.crv[agent_id] = crv
        self.children[agent_id] = set()
        self.children[parent_id].add(agent_id)
        self._commit({"op": "add_agent", "agent": agent_id, "parent": parent_id, "caps": sorted(caps)})
        return node

    def issue(self, *, sender_id: str, recipient_id: str, capability: str, payload: bytes, crv: CRVPolicy, evidence_level: EvidenceLevel, ttl_ms: int = 30_000) -> MeshEnvelope:
        sender = self.nodes.get(sender_id)
        recipient = self.nodes.get(recipient_id)
        if sender is None or recipient is None:
            raise MeshSecurityError("unknown mesh endpoint")
        if sender.tenant_id != recipient.tenant_id:
            raise MeshSecurityError("cross-tenant message denied")
        if capability not in sender.capabilities or capability not in recipient.capabilities:
            raise MeshSecurityError("capability denied")
        rcrv = self.crv[recipient_id]
        rcrv.child(input_bytes=crv.max_input_bytes, output_bytes=crv.max_output_bytes, compute_units=crv.max_compute_units, wall_ms=crv.max_wall_ms)
        if evidence_level < max(rcrv.min_evidence_level, crv.min_evidence_level):
            raise MeshSecurityError("insufficient evidence level")
        if len(payload) > crv.max_input_bytes:
            raise MeshSecurityError("payload exceeds CRV input budget")
        now = int(time.time() * 1000)
        unsigned = MeshEnvelope(
            message_id=f"msg_{uuid.uuid4().hex}", tenant_id=sender.tenant_id, sender_id=sender_id,
            recipient_id=recipient_id, capability=capability, nonce=uuid.uuid4().hex,
            issued_at_ms=now, expires_at_ms=now + max(1, ttl_ms), evidence_level=int(evidence_level),
            crv=crv, payload_hash=hashlib.sha256(payload).hexdigest(), parent_state_hash=self.state_hash,
        )
        mac = hmac.new(self._secret, _canonical(unsigned.unsigned()), hashlib.sha256).hexdigest()
        return MeshEnvelope(**{**unsigned.__dict__, "mac": mac})

    def verify(self, envelope: MeshEnvelope, payload: bytes, *, destructive: bool = False) -> bool:
        now = int(time.time() * 1000)
        if now > envelope.expires_at_ms or envelope.issued_at_ms > now + 5_000:
            raise MeshSecurityError("expired or future envelope")
        sender = self.nodes.get(envelope.sender_id)
        recipient = self.nodes.get(envelope.recipient_id)
        if sender is None or recipient is None or sender.tenant_id != envelope.tenant_id or recipient.tenant_id != envelope.tenant_id:
            raise MeshSecurityError("identity or tenant mismatch")
        if envelope.capability not in sender.capabilities or envelope.capability not in recipient.capabilities:
            raise MeshSecurityError("capability denied")
        expected = hmac.new(self._secret, _canonical(envelope.unsigned()), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, envelope.mac):
            raise MeshSecurityError("authentication failed")
        if hashlib.sha256(payload).hexdigest() != envelope.payload_hash:
            raise MeshSecurityError("payload integrity failed")
        nonce_key = (envelope.sender_id, envelope.nonce)
        if nonce_key in self.used_nonces:
            raise MeshSecurityError("replay rejected")
        rcrv = self.crv[envelope.recipient_id]
        rcrv.child(input_bytes=envelope.crv.max_input_bytes, output_bytes=envelope.crv.max_output_bytes, compute_units=envelope.crv.max_compute_units, wall_ms=envelope.crv.max_wall_ms)
        if envelope.evidence_level < int(rcrv.min_evidence_level):
            raise MeshSecurityError("evidence gate failed")
        if destructive and rcrv.require_quality_for_destructive_action and envelope.evidence_level < int(EvidenceLevel.EEA_2_QUALITY):
            raise MeshSecurityError("quality evidence required for destructive action")
        self.used_nonces.add(nonce_key)
        self._commit({"op": "accept", "message": envelope.message_id, "sender": envelope.sender_id, "recipient": envelope.recipient_id, "payload_hash": envelope.payload_hash})
        return True
