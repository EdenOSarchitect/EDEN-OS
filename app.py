from __future__ import annotations

from flask import Flask, jsonify, request

from optimizer_v1.core import EdenOptimizer

app = Flask(__name__)
optimizer = EdenOptimizer()


def azure_executor(payload):
    """Bounded deterministic CPU workload for Azure /prove validation."""
    payload = payload or {}
    iterations = int(payload.get("iterations", 1_000_000))
    seed = int(payload.get("seed", 1)) & 0xFFFFFFFF
    if iterations < 1 or iterations > 5_000_000:
        raise ValueError("iterations must be between 1 and 5000000")

    x = seed
    checksum = 0
    for i in range(iterations):
        x = (1664525 * x + 1013904223 + i) & 0xFFFFFFFF
        checksum ^= x

    return {
        "iterations": iterations,
        "seed": seed,
        "final_state": x,
        "checksum": checksum,
    }


@app.get("/")
def root():
    return jsonify({
        "product": "EDEN Compute Optimizer",
        "version": optimizer.VERSION,
        "deployment": "Azure App Service",
        "status": "ok",
    })


@app.get("/health")
def health():
    body = optimizer.health()
    body["deployment"] = "Azure App Service"
    return jsonify(body)


@app.post("/analyze")
def analyze():
    body = request.get_json(silent=True) or {}
    return jsonify(optimizer.analyze(str(body.get("workload_id") or "anonymous"), body.get("payload")))


@app.post("/prove")
def prove():
    try:
        body = request.get_json(silent=True) or {}
        report = optimizer.prove(
            str(body.get("workload_id") or "azure-prove"),
            body.get("payload") or {},
            azure_executor,
        )
        report["deployment"] = {
            "platform": "Azure App Service",
            "app_name": "EDEN-OS",
        }
        return jsonify(report)
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/report")
def report():
    body = optimizer.report()
    body["deployment"] = "Azure App Service"
    return jsonify(body)
