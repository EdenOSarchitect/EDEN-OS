import unittest

from optimizer_v1.core import EdenOptimizer, OptimizationMode


def executor(payload):
    return {"value": int(payload["x"]) ** 2}


class OptimizerTests(unittest.TestCase):
    def test_health(self):
        optimizer = EdenOptimizer()
        self.assertEqual(optimizer.health()["status"], "ok")
        self.assertEqual(optimizer.health()["version"], "1.0.0")

    def test_observe_does_not_reuse(self):
        optimizer = EdenOptimizer()
        a = optimizer.execute("w", {"x": 4}, executor, OptimizationMode.OBSERVE)
        b = optimizer.execute("w", {"x": 4}, executor, OptimizationMode.OBSERVE)
        self.assertFalse(a.reused)
        self.assertFalse(b.reused)
        self.assertEqual(a.output_hash, b.output_hash)

    def test_optimize_reuses_exact_input(self):
        optimizer = EdenOptimizer()
        first = optimizer.execute("w", {"x": 4}, executor, OptimizationMode.OPTIMIZE)
        second = optimizer.execute("w", {"x": 4}, executor, OptimizationMode.OPTIMIZE)
        self.assertFalse(first.reused)
        self.assertTrue(second.reused)
        self.assertEqual(first.output_hash, second.output_hash)

    def test_different_input_does_not_reuse(self):
        optimizer = EdenOptimizer()
        optimizer.execute("w", {"x": 4}, executor, OptimizationMode.OPTIMIZE)
        second = optimizer.execute("w", {"x": 5}, executor, OptimizationMode.OPTIMIZE)
        self.assertFalse(second.reused)

    def test_prove_requires_equivalent_output(self):
        optimizer = EdenOptimizer()
        report = optimizer.prove("w", {"x": 9}, executor)
        self.assertEqual(report["verification"]["output_equivalence"], "PASS")
        self.assertTrue(report["verification"]["reuse_observed"])
        self.assertEqual(report["metrics"]["full_execution_avoided"], 1)
        self.assertFalse(report["evidence"]["independent_validation"])
        self.assertFalse(report["evidence"]["economic_saving_claimed"])
        self.assertTrue(report["report_commitment"].startswith("sha256:"))


if __name__ == "__main__":
    unittest.main()
