import unittest

from eden_agent_mesh import AgentMesh, CRVPolicy, MeshSecurityError
from eden_evidence import EvidenceLevel


class AgentMeshTests(unittest.TestCase):
    def setUp(self):
        self.root_crv = CRVPolicy(1_000_000, 1_000_000, 1000.0, 60_000)
        self.mesh = AgentMesh(root_tenant="tenant-a", root_secret=b"x" * 32, root_crv=self.root_crv)
        child_crv = CRVPolicy(100_000, 100_000, 100.0, 10_000)
        self.mesh.add_agent(parent_id="eden-root", agent_id="observer", capabilities={"mesh.observe", "evidence.write"}, crv=child_crv)

    def test_round_trip_and_replay_rejection(self):
        crv = CRVPolicy(1024, 1024, 1.0, 1000)
        payload = b"observation"
        env = self.mesh.issue(sender_id="observer", recipient_id="eden-root", capability="mesh.observe", payload=payload, crv=crv, evidence_level=EvidenceLevel.EEA_1_INTEGRITY)
        self.assertTrue(self.mesh.verify(env, payload))
        with self.assertRaises(MeshSecurityError):
            self.mesh.verify(env, payload)

    def test_tamper_rejected(self):
        crv = CRVPolicy(1024, 1024, 1.0, 1000)
        env = self.mesh.issue(sender_id="observer", recipient_id="eden-root", capability="mesh.observe", payload=b"good", crv=crv, evidence_level=EvidenceLevel.EEA_1_INTEGRITY)
        with self.assertRaises(MeshSecurityError):
            self.mesh.verify(env, b"evil")

    def test_capability_escalation_rejected(self):
        with self.assertRaises(MeshSecurityError):
            self.mesh.add_agent(parent_id="observer", agent_id="bad-child", capabilities={"mesh.delegate"}, crv=CRVPolicy(1, 1, 1.0, 1))

    def test_crv_escalation_rejected(self):
        with self.assertRaises(MeshSecurityError):
            self.mesh.add_agent(parent_id="observer", agent_id="oversized", capabilities={"mesh.observe"}, crv=CRVPolicy(200_000, 1, 1.0, 1))

    def test_destructive_requires_quality(self):
        crv = CRVPolicy(1024, 1024, 1.0, 1000)
        env = self.mesh.issue(sender_id="observer", recipient_id="eden-root", capability="mesh.observe", payload=b"x", crv=crv, evidence_level=EvidenceLevel.EEA_1_INTEGRITY)
        with self.assertRaises(MeshSecurityError):
            self.mesh.verify(env, b"x", destructive=True)

    def test_large_tree_bounded(self):
        # Demonstrates deterministic hierarchical expansion without allocating an unbounded mesh.
        for i in range(64):
            self.mesh.add_agent(parent_id="observer", agent_id=f"leaf-{i}", capabilities={"mesh.observe"}, crv=CRVPolicy(1000, 1000, 1.0, 1000))
        self.assertEqual(len(self.mesh.children["observer"]), 64)


if __name__ == "__main__":
    unittest.main()
