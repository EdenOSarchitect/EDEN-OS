import json, hashlib

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()

def sha256_obj(obj):
    return hashlib.sha256(canonical(obj)).hexdigest()

def make_step(kind, provider, model_or_tool, duration_ms, input_tokens=0, output_tokens=0,
              cost_usd=0.0, success=True, metadata=None):
    body = {
        "schema": "EDEN-Agent-Step-v1",
        "kind": kind,
        "provider": provider,
        "model_or_tool": model_or_tool,
        "duration_ms": float(duration_ms),
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "cost_usd": float(cost_usd),
        "success": bool(success),
        "metadata": metadata or {}
    }
    return {"body": body, "hash_sha256": sha256_obj(body)}

def make_agent_marble(task_id, workload_id, steps, quality_score, quality_threshold,
                      result_summary, energy_kwh=None):
    totals = {
        "steps": len(steps),
        "successful_steps": sum(1 for s in steps if s["body"]["success"]),
        "duration_ms": sum(s["body"]["duration_ms"] for s in steps),
        "input_tokens": sum(s["body"]["input_tokens"] for s in steps),
        "output_tokens": sum(s["body"]["output_tokens"] for s in steps),
        "cost_usd": sum(s["body"]["cost_usd"] for s in steps),
        "energy_kwh": energy_kwh
    }
    quality_pass = quality_score >= quality_threshold
    body = {
        "schema": "EDEN-Agent-Marble-v1",
        "task_id": task_id,
        "workload_id": workload_id,
        "step_hashes": [s["hash_sha256"] for s in steps],
        "totals": totals,
        "quality": {
            "score": float(quality_score),
            "threshold": float(quality_threshold),
            "pass": quality_pass
        },
        "result_summary": result_summary,
        "truth_boundary": {
            "measured_from_real_provider_billing": False,
            "measured_energy": energy_kwh is not None,
            "economic_saving_proven": False
        }
    }
    return {"body": body, "hash_sha256": sha256_obj(body)}

def compare_runs(baseline, candidate):
    b = baseline["body"]
    c = candidate["body"]
    if b["workload_id"] != c["workload_id"]:
        return {"status": "NOT_COMPARABLE", "reason": "workload_id_mismatch"}
    if not c["quality"]["pass"]:
        return {"status": "QUALITY_FAILED", "verified_efficiency": False}
    if not b["quality"]["pass"]:
        return {"status": "INVALID_BASELINE", "verified_efficiency": False}
    bcost, ccost = b["totals"]["cost_usd"], c["totals"]["cost_usd"]
    btime, ctime = b["totals"]["duration_ms"], c["totals"]["duration_ms"]
    cost_delta = bcost - ccost
    time_delta = btime - ctime
    result = {
        "status": "QUALITY_PASSED",
        "verified_efficiency": cost_delta > 0 or time_delta > 0,
        "cost_delta_usd": cost_delta,
        "cost_improvement_fraction": (cost_delta / bcost) if bcost else None,
        "duration_delta_ms": time_delta,
        "duration_improvement_fraction": (time_delta / btime) if btime else None,
        "baseline_hash": baseline["hash_sha256"],
        "candidate_hash": candidate["hash_sha256"],
        "economic_saving_proven": False,
        "note": "Cost values in this demo are scenario inputs, not reconciled provider invoices."
    }
    result["comparison_hash_sha256"] = sha256_obj(result)
    return result
