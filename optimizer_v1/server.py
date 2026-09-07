from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from optimizer_v1.core import EdenOptimizer, OptimizationMode

optimizer = EdenOptimizer()


def default_executor(payload: Any) -> Any:
    """Deterministic demo executor used by the standalone API.

    Production integrations should replace this with the customer's workload adapter.
    """
    if isinstance(payload, dict) and "numbers" in payload:
        numbers = payload["numbers"]
        return {
            "count": len(numbers),
            "sum": sum(numbers),
            "sum_squares": sum(float(x) * float(x) for x in numbers),
        }
    return payload


class Handler(BaseHTTPRequestHandler):
    server_version = "EDEN-Optimizer/1.0"

    def _json(self, status: int, body: Dict[str, Any]) -> None:
        raw = json.dumps(body, sort_keys=True, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(200, optimizer.health())
            return
        if self.path == "/report":
            self._json(200, optimizer.report())
            return
        self._json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        try:
            body = self._body()
            workload_id = str(body.get("workload_id") or "anonymous")
            payload = body.get("payload")

            if self.path == "/analyze":
                self._json(200, optimizer.analyze(workload_id, payload))
                return

            if self.path == "/execute":
                mode = OptimizationMode(str(body.get("mode") or "OPTIMIZE").upper())
                result = optimizer.execute(workload_id, payload, default_executor, mode)
                self._json(200, result.__dict__)
                return

            if self.path == "/verify":
                # Verification is normally produced by /prove. Keep this endpoint
                # narrowly scoped to explicit hashes to avoid inventing execution evidence.
                baseline_hash = body.get("baseline_output_hash")
                eden_hash = body.get("eden_output_hash")
                if not baseline_hash or not eden_hash:
                    self._json(400, {"error": "baseline_output_hash and eden_output_hash are required"})
                    return
                self._json(200, {"output_equivalence": "PASS" if baseline_hash == eden_hash else "FAIL"})
                return

            if self.path == "/prove":
                self._json(200, optimizer.prove(workload_id, payload, default_executor))
                return

            self._json(404, {"error": "not_found"})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self._json(400, {"error": str(exc)})
        except Exception as exc:
            self._json(500, {"error": type(exc).__name__, "message": str(exc)})


def run(host: str = "127.0.0.1", port: int = 8766) -> None:
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"EDEN Compute Optimizer v1 listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
