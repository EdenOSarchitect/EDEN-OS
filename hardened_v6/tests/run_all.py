from __future__ import annotations

import copy
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)

from eden_evidence import EfficiencyEvidence, EvidenceError, EvidenceLevel
from eden_naming import rcu_from_kept_bytes
from eden_response_sealer_v2 import build_response_packet, seal_packet, verify_sealed_packet
from eden_marble_exchange_v2 import AgentKeypair, SqliteMarbleLedger, ReplayError, OwnershipError
from chrononav_v4 import Chrononav
from eden_policy import authorize_reclaim
from eden_audit_ledger import AuditLedger


def check(name, fn):
    try:
        fn()
        print(f"PASS {name}")
        return True
    except Exception as e:
        print(f"FAIL {name}: {type(e).__name__}: {e}")
        return False


def test_seal_tamper():
    pkt = build_response_packet({"output_text":"hello","usage":{"output_tokens":1}}, tenant_id="t1", parent_packet_id="p1", request_packet_hash="ab"*32, provider="synthetic")
    sealed = seal_packet(pkt, secret="secret")
    assert verify_sealed_packet(sealed, secret="secret")["ok"]
    altered = copy.deepcopy(sealed)
    altered["body"]["response"]["text"] = "evil"
    assert not verify_sealed_packet(altered, secret="secret")["ok"]


def test_hmac_wrong_secret():
    pkt=build_response_packet({"output_text":"x"}, tenant_id="t", parent_packet_id="p", request_packet_hash="h", provider="x")
    sealed=seal_packet(pkt,secret="right")
    assert not verify_sealed_packet(sealed,secret="wrong")["ok"]


def test_evidence_order():
    e=EfficiencyEvidence("tenant","work",0.2,20,100)
    try:
        e.verify_efficiency(saving=1,unit="gpu_s")
        raise AssertionError("promotion should fail")
    except EvidenceError:
        pass
    e.freeze_quality_gate(metric="accuracy",threshold=.98,direction="gte").start_measurement()
    e.verify_integrity().verify_quality(before=.99,after=.99,approved_reclaim_bytes=10)
    e.verify_efficiency(saving=3,unit="gpu_s").verify_economic(amount=2.5,currency="GBP")
    assert e.level == EvidenceLevel.EEA_4_ECONOMIC
    assert abs(e.economic_license_share(.4)-1.0)<1e-12


def test_quality_gate_must_be_frozen_before_measurement():
    e=EfficiencyEvidence("t","freeze",0.1,10,100)
    try:
        e.start_measurement()
        raise AssertionError("measurement must not start without frozen quality gate")
    except EvidenceError:
        pass
    e.freeze_quality_gate(metric="accuracy",threshold=.95,direction="gte").start_measurement()
    try:
        e.freeze_quality_gate(metric="accuracy",threshold=.90,direction="gte")
        raise AssertionError("quality gate must be immutable once frozen")
    except EvidenceError:
        pass


def test_quality_failure_zero_credit():
    e=EfficiencyEvidence("t","quality-fail",0.5,50,100)
    e.freeze_quality_gate(metric="accuracy",threshold=.97,direction="gte").start_measurement().verify_integrity()
    try:
        e.verify_quality(before=.98,after=.92,approved_reclaim_bytes=40)
        raise AssertionError("quality failure must not reach EEA-2")
    except EvidenceError:
        pass
    assert e.level == EvidenceLevel.EEA_1_INTEGRITY
    assert e.quality_passed is False
    assert e.approved_reclaim_bytes == 0
    try:
        e.verify_efficiency(saving=30,unit="joule")
        raise AssertionError("quality failure must award zero efficiency credit")
    except EvidenceError:
        pass


def test_lower_is_better_quality_gate():
    e=EfficiencyEvidence("t","latency",0.1,10,100)
    e.freeze_quality_gate(metric="error_rate",threshold=.02,direction="lte").start_measurement().verify_integrity()
    e.verify_quality(before=.015,after=.019,approved_reclaim_bytes=5)
    assert e.level == EvidenceLevel.EEA_2_QUALITY


def test_candidate_not_saving():
    e=EfficiencyEvidence("t","w",0.3,30,100)
    try:
        e.economic_license_share(.4)
        raise AssertionError("must fail before economic verification")
    except EvidenceError:
        pass


def test_marble_transfer_and_replay():
    ledger=SqliteMarbleLedger(":memory:")
    a=AgentKeypair("a"); b=AgentKeypair("b")
    ledger.register_identity(a.identity); ledger.register_identity(b.identity)
    m=ledger.mint(owner_agent_id="a",content={"x":1})
    offer=ledger.create_offer(seller=a,marble_id=m["marble_id"],buyer_agent_id="b")
    acc=ledger.accept_offer(buyer=b,signed_offer=offer)
    receipt=ledger.commit_transfer(acc)
    v=ledger.verify_receipt(receipt)
    assert v["ok"] and v["seller_signature_ok"] and v["buyer_signature_ok"]
    try:
        ledger.commit_transfer(acc)
        raise AssertionError("replay should fail")
    except (ReplayError,OwnershipError):
        pass


def test_receipt_signature_tamper():
    ledger=SqliteMarbleLedger(":memory:")
    a=AgentKeypair("a"); b=AgentKeypair("b")
    ledger.register_identity(a.identity); ledger.register_identity(b.identity)
    m=ledger.mint(owner_agent_id="a",content={"x":1})
    offer=ledger.create_offer(seller=a,marble_id=m["marble_id"],buyer_agent_id="b")
    acc=ledger.accept_offer(buyer=b,signed_offer=offer)
    receipt=ledger.commit_transfer(acc)
    bad=copy.deepcopy(receipt)
    bad["evidence"]["acceptance"]["buyer_agent_id"]="mallory"
    assert not ledger.verify_receipt(bad)["ok"]


def test_identity_key_conflict():
    ledger=SqliteMarbleLedger(":memory:")
    a1=AgentKeypair("a"); a2=AgentKeypair("a")
    ledger.register_identity(a1.identity)
    try:
        ledger.register_identity(a2.identity)
        raise AssertionError("key conflict should fail")
    except Exception:
        pass


def test_chrononav_uncertainty():
    c=Chrononav()
    c.observe_at("INGEST",0.0,refinement_score=.1,compression_ratio=1.0,entropy=4.8,token_count=100,byte_count=400,latency_ms=10,clock_uncertainty_ns=100)
    c.observe_at("RESPONSE",0.5,refinement_score=.4,compression_ratio=.8,entropy=4.2,token_count=80,byte_count=300,latency_ms=12,clock_uncertainty_ns=200)
    p=c.packet()
    assert p["time_basis"]["clock_uncertainty_ns_max"]==200
    assert p["claims"]["time_dilation_inferred"] is False


def test_rcu_name():
    assert rcu_from_kept_bytes(1024**4)==1.0


def test_reclaim_fail_closed():
    e=EfficiencyEvidence("t","w",0.3,30,100)
    assert not authorize_reclaim(e,tenant_approved=True).allowed
    e.freeze_quality_gate(metric="accuracy",threshold=.98,direction="gte").start_measurement()
    e.verify_integrity().verify_quality(before=.99,after=.99,approved_reclaim_bytes=20)
    assert not authorize_reclaim(e,tenant_approved=False).allowed
    d=authorize_reclaim(e,tenant_approved=True,max_reclaim_bytes=10)
    assert d.allowed and d.approved_bytes==10


def test_audit_chain():
    a=AuditLedger(":memory:")
    a.append(tenant_id="t",event_type="OBSERVED",body={"x":1})
    a.append(tenant_id="t",event_type="VERIFIED",body={"x":2})
    assert a.verify_tenant_chain("t")["ok"]
    a.db.execute("UPDATE audit_events SET body_json=? WHERE seq=1", ('{"x":999}',))
    assert not a.verify_tenant_chain("t")["ok"]


def test_seal_metadata_tamper():
    pkt=build_response_packet({"output_text":"x"}, tenant_id="t", parent_packet_id="p", request_packet_hash="h", provider="x")
    sealed=seal_packet(pkt,secret="right")
    sealed["seal"]["sealed_at_unix_ms"] += 1
    assert not verify_sealed_packet(sealed,secret="right")["ok"]


def main():
    tests=[
        ("seal_tamper",test_seal_tamper),
        ("hmac_wrong_secret",test_hmac_wrong_secret),
        ("evidence_order",test_evidence_order),
        ("quality_gate_must_be_frozen_before_measurement",test_quality_gate_must_be_frozen_before_measurement),
        ("quality_failure_zero_credit",test_quality_failure_zero_credit),
        ("lower_is_better_quality_gate",test_lower_is_better_quality_gate),
        ("candidate_not_saving",test_candidate_not_saving),
        ("marble_transfer_and_replay",test_marble_transfer_and_replay),
        ("receipt_signature_tamper",test_receipt_signature_tamper),
        ("identity_key_conflict",test_identity_key_conflict),
        ("chrononav_uncertainty",test_chrononav_uncertainty),
        ("rcu_name",test_rcu_name),
        ("reclaim_fail_closed",test_reclaim_fail_closed),
        ("audit_chain",test_audit_chain),
        ("seal_metadata_tamper",test_seal_metadata_tamper),
    ]
    ok=sum(check(n,f) for n,f in tests)
    print(json.dumps({"passed":ok,"total":len(tests),"ok":ok==len(tests)},indent=2))
    raise SystemExit(0 if ok==len(tests) else 1)

if __name__=="__main__":
    main()
