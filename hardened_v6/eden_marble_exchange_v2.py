from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from eden_common import b64d, b64e, sha256_hex, domain_bytes

PROTOCOL = "EDEN-OS/Marble-Exchange-v2"
VERSION = "2.0"


class MarbleExchangeError(Exception): pass
class SignatureError(MarbleExchangeError): pass
class OwnershipError(MarbleExchangeError): pass
class ReplayError(MarbleExchangeError): pass
class StateConflictError(MarbleExchangeError): pass


@dataclass(frozen=True)
class AgentIdentity:
    agent_id: str
    public_key_b64: str

    @classmethod
    def from_public_key(cls, agent_id: str, key: Ed25519PublicKey) -> "AgentIdentity":
        raw = key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
        return cls(agent_id, b64e(raw))

    def public_key(self) -> Ed25519PublicKey:
        return Ed25519PublicKey.from_public_bytes(b64d(self.public_key_b64))


class AgentKeypair:
    def __init__(self, agent_id: str, private_key: Optional[Ed25519PrivateKey] = None):
        if not agent_id:
            raise ValueError("agent_id is required")
        self.agent_id = agent_id
        self._private_key = private_key or Ed25519PrivateKey.generate()
        self.identity = AgentIdentity.from_public_key(agent_id, self._private_key.public_key())

    def sign(self, domain: str, payload: Mapping[str, Any]) -> str:
        return b64e(self._private_key.sign(domain_bytes(domain, dict(payload))))

    def export_private_key_b64_for_dev_only(self) -> str:
        raw = self._private_key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
        return b64e(raw)

    @classmethod
    def from_private_key_b64_dev_only(cls, agent_id: str, encoded: str) -> "AgentKeypair":
        return cls(agent_id, Ed25519PrivateKey.from_private_bytes(b64d(encoded)))


def verify_signature(identity: AgentIdentity, domain: str, payload: Mapping[str, Any], signature_b64: str) -> bool:
    try:
        identity.public_key().verify(b64d(signature_b64), domain_bytes(domain, dict(payload)))
        return True
    except Exception:
        return False


class SqliteMarbleLedger:
    """Transactional reference ledger. SQLite is local/reference state, not global consensus."""

    def __init__(self, path: str = ":memory:"):
        self.path = path
        self._lock = threading.RLock()
        self.db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self) -> None:
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS identities(agent_id TEXT PRIMARY KEY, public_key_b64 TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS marbles(marble_id TEXT PRIMARY KEY, owner_agent_id TEXT NOT NULL, content_hash TEXT NOT NULL, metadata_json TEXT NOT NULL, transfer_seq INTEGER NOT NULL DEFAULT 0, last_transfer_id TEXT, FOREIGN KEY(owner_agent_id) REFERENCES identities(agent_id));
        CREATE TABLE IF NOT EXISTS used_nonces(nonce TEXT PRIMARY KEY, transfer_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS transfers(transfer_id TEXT PRIMARY KEY, marble_id TEXT NOT NULL, transfer_seq INTEGER NOT NULL, receipt_json TEXT NOT NULL, UNIQUE(marble_id, transfer_seq));
        """)

    def register_identity(self, identity: AgentIdentity) -> None:
        with self._lock:
            row = self.db.execute("SELECT public_key_b64 FROM identities WHERE agent_id=?", (identity.agent_id,)).fetchone()
            if row and row["public_key_b64"] != identity.public_key_b64:
                raise StateConflictError("agent_id already bound to another key")
            self.db.execute("INSERT OR IGNORE INTO identities(agent_id, public_key_b64) VALUES (?,?)", (identity.agent_id, identity.public_key_b64))

    def _identity(self, agent_id: str) -> AgentIdentity:
        row = self.db.execute("SELECT * FROM identities WHERE agent_id=?", (agent_id,)).fetchone()
        if not row:
            raise MarbleExchangeError(f"unknown identity: {agent_id}")
        return AgentIdentity(row["agent_id"], row["public_key_b64"])

    def mint(self, *, owner_agent_id: str, content: Mapping[str, Any], metadata: Optional[Mapping[str, Any]]=None, marble_id: Optional[str]=None) -> dict[str, Any]:
        self._identity(owner_agent_id)
        mid = marble_id or f"marble_{uuid.uuid4().hex}"
        content_hash = sha256_hex(dict(content), domain="marble-content-v2")
        with self._lock:
            try:
                self.db.execute("INSERT INTO marbles(marble_id, owner_agent_id, content_hash, metadata_json) VALUES (?,?,?,?)", (mid, owner_agent_id, content_hash, json.dumps(dict(metadata or {}), sort_keys=True)))
            except sqlite3.IntegrityError as exc:
                raise StateConflictError("marble already exists") from exc
        return self.get(mid)

    def get(self, marble_id: str) -> dict[str, Any]:
        row = self.db.execute("SELECT * FROM marbles WHERE marble_id=?", (marble_id,)).fetchone()
        if not row:
            raise MarbleExchangeError(f"unknown marble: {marble_id}")
        return {"marble_id": row["marble_id"], "owner_agent_id": row["owner_agent_id"], "content_hash": row["content_hash"], "metadata": json.loads(row["metadata_json"]), "transfer_seq": row["transfer_seq"], "last_transfer_id": row["last_transfer_id"]}

    def create_offer(self, *, seller: AgentKeypair, marble_id: str, buyer_agent_id: str, rights: str="control_and_provenance_record", consideration: Optional[Mapping[str,Any]]=None, expires_at_unix_ms: Optional[int]=None) -> dict[str, Any]:
        record = self.get(marble_id)
        if record["owner_agent_id"] != seller.agent_id:
            raise OwnershipError("seller is not current owner")
        seller_registered = self._identity(seller.agent_id)
        if seller_registered.public_key_b64 != seller.identity.public_key_b64:
            raise SignatureError("seller key does not match registered identity")
        self._identity(buyer_agent_id)
        payload = {"protocol": PROTOCOL, "version": VERSION, "event_type": "MARBLE_TRANSFER_OFFER", "offer_id": f"offer_{uuid.uuid4().hex}", "marble_id": marble_id, "marble_content_hash": record["content_hash"], "seller_agent_id": seller.agent_id, "buyer_agent_id": buyer_agent_id, "rights": rights, "consideration": dict(consideration or {}), "transfer_seq": record["transfer_seq"] + 1, "nonce": f"nonce_{uuid.uuid4().hex}", "created_at_unix_ms": int(time.time()*1000), "expires_at_unix_ms": expires_at_unix_ms, "previous_transfer_id": record["last_transfer_id"]}
        return {"payload": payload, "seller_signature_ed25519": seller.sign("marble-offer-v2", payload)}

    def accept_offer(self, *, buyer: AgentKeypair, signed_offer: Mapping[str, Any]) -> dict[str, Any]:
        offer = dict(signed_offer.get("payload") or {})
        seller_sig = signed_offer.get("seller_signature_ed25519")
        if offer.get("buyer_agent_id") != buyer.agent_id:
            raise OwnershipError("offer addressed to another buyer")
        buyer_registered = self._identity(buyer.agent_id)
        if buyer_registered.public_key_b64 != buyer.identity.public_key_b64:
            raise SignatureError("buyer key does not match registered identity")
        seller_id = str(offer.get("seller_agent_id"))
        seller_identity = self._identity(seller_id)
        if not seller_sig or not verify_signature(seller_identity, "marble-offer-v2", offer, str(seller_sig)):
            raise SignatureError("seller signature verification failed")
        record = self.get(str(offer.get("marble_id")))
        if record["owner_agent_id"] != seller_id:
            raise OwnershipError("seller no longer owns marble")
        if offer.get("transfer_seq") != record["transfer_seq"] + 1:
            raise ReplayError("stale transfer sequence")
        if offer.get("marble_content_hash") != record["content_hash"]:
            raise StateConflictError("marble content hash mismatch")
        expires = offer.get("expires_at_unix_ms")
        if expires is not None and int(time.time()*1000) > int(expires):
            raise ReplayError("offer expired")
        acceptance = {"protocol": PROTOCOL, "version": VERSION, "event_type": "MARBLE_TRANSFER_ACCEPTANCE", "acceptance_id": f"accept_{uuid.uuid4().hex}", "offer_id": offer["offer_id"], "offer_hash": sha256_hex(offer, domain="marble-offer-v2"), "marble_id": offer["marble_id"], "seller_agent_id": seller_id, "buyer_agent_id": buyer.agent_id, "transfer_seq": offer["transfer_seq"], "nonce": offer["nonce"], "accepted_at_unix_ms": int(time.time()*1000)}
        return {"offer": dict(signed_offer), "acceptance": acceptance, "buyer_signature_ed25519": buyer.sign("marble-acceptance-v2", acceptance)}

    def commit_transfer(self, signed_acceptance: Mapping[str, Any]) -> dict[str, Any]:
        signed_offer = signed_acceptance.get("offer")
        if not isinstance(signed_offer, Mapping):
            raise MarbleExchangeError("missing signed offer")
        offer = dict(signed_offer.get("payload") or {})
        seller_sig = str(signed_offer.get("seller_signature_ed25519") or "")
        acceptance = dict(signed_acceptance.get("acceptance") or {})
        buyer_sig = str(signed_acceptance.get("buyer_signature_ed25519") or "")
        seller_id = str(offer.get("seller_agent_id")); buyer_id = str(offer.get("buyer_agent_id")); marble_id = str(offer.get("marble_id")); nonce = str(offer.get("nonce"))
        seller_identity = self._identity(seller_id); buyer_identity = self._identity(buyer_id)
        if not verify_signature(seller_identity, "marble-offer-v2", offer, seller_sig):
            raise SignatureError("invalid seller signature")
        if not verify_signature(buyer_identity, "marble-acceptance-v2", acceptance, buyer_sig):
            raise SignatureError("invalid buyer signature")
        if acceptance.get("offer_hash") != sha256_hex(offer, domain="marble-offer-v2"):
            raise StateConflictError("acceptance not bound to offer")
        if acceptance.get("offer_id") != offer.get("offer_id") or acceptance.get("nonce") != nonce:
            raise StateConflictError("offer/acceptance binding mismatch")
        with self._lock:
            self.db.execute("BEGIN IMMEDIATE")
            try:
                record = self.get(marble_id)
                if record["owner_agent_id"] != seller_id: raise OwnershipError("seller no longer owns marble")
                if offer.get("transfer_seq") != record["transfer_seq"] + 1: raise ReplayError("stale transfer sequence")
                if self.db.execute("SELECT 1 FROM used_nonces WHERE nonce=?", (nonce,)).fetchone(): raise ReplayError("nonce already consumed")
                transfer_id = f"transfer_{uuid.uuid4().hex}"
                body = {"protocol": PROTOCOL, "version": VERSION, "event_type": "MARBLE_TRANSFER_RECEIPT", "transfer_id": transfer_id, "marble_id": marble_id, "marble_content_hash": record["content_hash"], "from_agent_id": seller_id, "to_agent_id": buyer_id, "rights": offer.get("rights"), "consideration": offer.get("consideration", {}), "transfer_seq": offer["transfer_seq"], "offer_id": offer["offer_id"], "acceptance_id": acceptance["acceptance_id"], "nonce": nonce, "previous_transfer_id": record["last_transfer_id"], "offer_hash": sha256_hex(offer, domain="marble-offer-v2"), "acceptance_hash": sha256_hex(acceptance, domain="marble-acceptance-v2"), "committed_at_unix_ms": int(time.time()*1000)}
                receipt = {"body": body, "seal": {"algorithm": "SHA-256", "domain": "marble-receipt-v2", "content_hash": sha256_hex(body, domain="marble-receipt-v2")}, "signatures": {"seller_offer_signature_ed25519": seller_sig, "buyer_acceptance_signature_ed25519": buyer_sig}, "evidence": {"signed_offer": dict(signed_offer), "acceptance": acceptance}}
                cur = self.db.execute("UPDATE marbles SET owner_agent_id=?, transfer_seq=?, last_transfer_id=? WHERE marble_id=? AND owner_agent_id=? AND transfer_seq=?", (buyer_id, offer["transfer_seq"], transfer_id, marble_id, seller_id, record["transfer_seq"]))
                if cur.rowcount != 1: raise StateConflictError("ownership state changed concurrently")
                self.db.execute("INSERT INTO used_nonces(nonce, transfer_id) VALUES (?,?)", (nonce, transfer_id))
                self.db.execute("INSERT INTO transfers(transfer_id, marble_id, transfer_seq, receipt_json) VALUES (?,?,?,?)", (transfer_id, marble_id, offer["transfer_seq"], json.dumps(receipt, sort_keys=True)))
                self.db.execute("COMMIT")
                return receipt
            except Exception:
                self.db.execute("ROLLBACK")
                raise

    def verify_receipt(self, receipt: Mapping[str, Any]) -> dict[str, Any]:
        body = receipt.get("body"); seal = receipt.get("seal"); evidence = receipt.get("evidence")
        if not isinstance(body, Mapping) or not isinstance(seal, Mapping) or not isinstance(evidence, Mapping):
            return {"ok": False, "error": "invalid_receipt_shape"}
        hash_ok = seal.get("content_hash") == sha256_hex(dict(body), domain="marble-receipt-v2")
        signed_offer = evidence.get("signed_offer"); acceptance = evidence.get("acceptance")
        if not isinstance(signed_offer, Mapping) or not isinstance(acceptance, Mapping):
            return {"ok": False, "content_hash_ok": hash_ok, "error": "missing_evidence"}
        offer = dict(signed_offer.get("payload") or {})
        seller_sig = str(signed_offer.get("seller_signature_ed25519") or "")
        buyer_sig = str((receipt.get("signatures") or {}).get("buyer_acceptance_signature_ed25519") or "")
        try:
            seller = self._identity(str(body.get("from_agent_id"))); buyer = self._identity(str(body.get("to_agent_id")))
        except MarbleExchangeError:
            return {"ok": False, "content_hash_ok": hash_ok, "error": "unknown_identity"}
        seller_ok = verify_signature(seller, "marble-offer-v2", offer, seller_sig)
        buyer_ok = verify_signature(buyer, "marble-acceptance-v2", dict(acceptance), buyer_sig)
        binding_ok = body.get("offer_hash") == sha256_hex(offer, domain="marble-offer-v2") and body.get("acceptance_hash") == sha256_hex(dict(acceptance), domain="marble-acceptance-v2") and body.get("offer_id") == offer.get("offer_id") and body.get("acceptance_id") == acceptance.get("acceptance_id")
        return {"ok": bool(hash_ok and seller_ok and buyer_ok and binding_ok), "content_hash_ok": hash_ok, "seller_signature_ok": seller_ok, "buyer_signature_ok": buyer_ok, "binding_ok": binding_ok, "marble_id": body.get("marble_id"), "transfer_id": body.get("transfer_id")}
