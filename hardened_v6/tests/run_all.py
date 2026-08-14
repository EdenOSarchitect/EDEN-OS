from __future__ import annotations

import copy
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)

from eden_evidence import EfficiencyEvidence, EvidenceError, EvidenceLevel
from eden_multiplicative_stack import MultiplicativeEfficiencyStack, StackError
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


def test_evidence_order_relative_quality():
    e=EfficiencyEvidence("tenant","work",0.2,20,100)
    try:
        e.verify_efficiency(saving=1,unit="gpu_s")
        raise AssertionError("promotion should fail")
    except EvidenceError:
        pass
    e.verify_integrity().verify_quality(metric="accuracy",before=.99,after=.99,direction="gte",approved_reclaim_bytes=10)
    e.verify_efficiency(saving=3,unit="gpu_s").verify_economic(amount=2.5,currency="GBP")
    assert e.level == EvidenceLevel.EEA_4_ECONOMIC
    assert e.quality_retention_factor == 1.0
    assert e.quality_adjusted_efficiency_credit == 3.0
    assert abs(e.economic_license_share(.4)-1.0)<1e-12


def test_quality_degradation_discounts_efficiency():
    e=EfficiencyEvidence("t","quality-relative",0.5,50,100)
    e.verify_integrity().verify_quality(metric="accuracy",before=1.0,after=.90,direction="gte",approved_reclaim_bytes=40)
    assert e.level == EvidenceLevel.EEA_2_QUALITY
    assert e.quality_passed is False
    assert abs(e.quality_retention_factor-.90)<1e-12
    assert e.approved_reclaim_bytes == 0
    e.verify_efficiency(saving=30,unit="joule")
    assert abs(e.quality_adjusted_efficiency_credit-27.0)<1e-12


def test_lower_is_better_relative_quality():
    e=EfficiencyEvidence("t","error-rate",0.1,10,100)
    e.verify_integrity().verify_quality(metric="error_rate",before=.02,after=.025,direction="lte",approved_reclaim_bytes=5)
    assert abs(e.quality_retention_factor-.8)<1e-12
    assert e.quality_passed is False
    assert e.approved_reclaim_bytes == 0


def test_multiplicative_stack_not_additive():
    s=MultiplicativeEfficiencyStack(baseline_resource=100.0,resource_unit="joule")
    s.add_stage("refinery",.20).add_stage("chrononav",.05).add_stage("transmit",.10)
    r=s.evaluate(overhead_fraction=0.0,quality_retention_factor=1.0)
    assert abs(r.gross_remaining_fraction-.684)<1e-12
    assert abs(r.net_resource_reduction-31.6)<1e-12


def test_multiplicative_stack_overhead_and_quality():
    s=MultiplicativeEfficiencyStack(baseline_resource=100.0,resource_unit="joule")
    s.add_stage("refinery",.20).add_stage("chrononav",.05)
    r=s.evaluate(overhead_fraction=.03,quality_retention_factor=.9)
    # 100 * (1-.20) * (1-.05) * 1.03 = 78.28 used; 21.72 measured reduction.
    assert abs(r.net_resource_used-78.28)<1e-9
    assert abs(r.net_resource_reduction-21.72)<1e-9
    assert abs(r.quality_adjusted_efficiency_credit-19.548)<1e-9


def test_multiplicative_stack_rejects_invalid_fraction():
    s=MultiplicativeEfficiencyStack(baseline_resource=1.0,resource_unit="unit")
    try:
        s.add_stage("bad",1.0)
        raise AssertionError("100% stage reduction should be rejected")
    except StackError:
        pass


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


def test_reclaim_still_fail_closed_on_quality_degradation():
    e=EfficiencyEvidence("t","w",0.3,30,100)
    assert not authorize_reclaim(e,tenant_approved=True).allowed
    e.verify_integrity().verify_quality(metric="accuracy",before=.99,after=.98,direction="gte",approved_reclaim_bytes=20)
    assert not authorize_reclaim(e,tenant_approved=True).allowed

    e2=EfficiencyEvidence("t","w2",0.3,30,100)
    e2.verify_integrity().verify_quality(metric="accuracy",before=.99,after=.99,direction="gte",approved_reclaim_bytes=20)
    assert not authorize_reclaim(e2,tenant_approved=False).allowed
    d=authorize_reclaim(e2,tenant_approved=True,max_reclaim_bytes=10)
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
        ("evidence_order_relative_quality",test_evidence_order_relative_quality),
        ("quality_degradation_discounts_efficiency",test_quality_degradation_discounts_efficiency),
        ("lower_is_better_relative_quality",test_lower_is_better_relative_quality),
        ("multiplicative_stack_not_additive",test_multiplicative_stack_not_additive),
        ("multiplicative_stack_overhead_and_quality",test_multiplicative_stack_overhead_and_quality),
        ("multiplicative_stack_rejects_invalid_fraction",test_multiplicative_stack_rejects_invalid_fraction),
        ("candidate_not_saving",test_candidate_not_saving),
        ("marble_transfer_and_replay",test_marble_transfer_and_replay),
        ("receipt_signature_tamper",test_receipt_signature_tamper),
        ("identity_key_conflict",test_identity_key_conflict),
        ("chrononav_uncertainty",test_chrononav_uncertainty),
        ("rcu_name",test_rcu_name),
        ("reclaim_still_fail_closed_on_quality_degradation",test_reclaim_still_fail_closed_on_quality_degradation),
        ("audit_chain",test_audit_chain),
        ("seal_metadata_tamper",test_seal_metadata_tamper),
    ]
    ok=sum(check(n,f) for n,f in tests)
    print(json.dumps({"passed":ok,"total":len(tests),"ok":ok==len(tests)},indent=2))
    raise SystemExit(0 if ok==len(tests) else 1)

if __name__=="__main__":
    main()
