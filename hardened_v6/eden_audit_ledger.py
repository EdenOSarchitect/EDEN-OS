from __future__ import annotations

import json
import sqlite3
import time
import uuid
from typing import Any, Dict, Mapping, Optional

from eden_common import sha256_hex


class AuditLedgerError(ValueError):
    pass


class AuditLedger:
    """Append-only, per-tenant hash-chained reference audit ledger."""

    def __init__(self, path: str = ":memory:"):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""
        CREATE TABLE IF NOT EXISTS audit_events(
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE NOT NULL,
            tenant_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            body_json TEXT NOT NULL,
            previous_hash TEXT,
            event_hash TEXT UNIQUE NOT NULL,
            created_at_unix_ms INTEGER NOT NULL
        )
        """)
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_audit_tenant_seq ON audit_events(tenant_id,seq)")

    def _last_hash(self, tenant_id: str) -> Optional[str]:
        row=self.db.execute(
            "SELECT event_hash FROM audit_events WHERE tenant_id=? ORDER BY seq DESC LIMIT 1",
            (tenant_id,),
        ).fetchone()
        return row["event_hash"] if row else None

    def append(self, *, tenant_id: str, event_type: str, body: Mapping[str, Any]) -> Dict[str, Any]:
        if not tenant_id or not event_type:
            raise AuditLedgerError("tenant_id and event_type required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            previous=self._last_hash(tenant_id)
            envelope={
                "event_id":f"audit_{uuid.uuid4().hex}",
                "tenant_id":tenant_id,
                "event_type":event_type,
                "body":dict(body),
                "previous_hash":previous,
                "created_at_unix_ms":int(time.time()*1000),
            }
            event_hash=sha256_hex(envelope,domain="audit-event-v1")
            self.db.execute(
                "INSERT INTO audit_events(event_id,tenant_id,event_type,body_json,previous_hash,event_hash,created_at_unix_ms) VALUES (?,?,?,?,?,?,?)",
                (envelope["event_id"],tenant_id,event_type,json.dumps(dict(body),sort_keys=True),previous,event_hash,envelope["created_at_unix_ms"]),
            )
            self.db.execute("COMMIT")
            envelope["event_hash"]=event_hash
            return envelope
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def verify_tenant_chain(self, tenant_id: str) -> Dict[str, Any]:
        rows=self.db.execute("SELECT * FROM audit_events WHERE tenant_id=? ORDER BY seq",(tenant_id,)).fetchall()
        previous=None
        for row in rows:
            envelope={
                "event_id":row["event_id"],
                "tenant_id":row["tenant_id"],
                "event_type":row["event_type"],
                "body":json.loads(row["body_json"]),
                "previous_hash":row["previous_hash"],
                "created_at_unix_ms":row["created_at_unix_ms"],
            }
            expected=sha256_hex(envelope,domain="audit-event-v1")
            if row["previous_hash"] != previous or row["event_hash"] != expected:
                return {"ok":False,"failed_event_id":row["event_id"],"count":len(rows)}
            previous=row["event_hash"]
        return {"ok":True,"count":len(rows),"head_hash":previous}
