import unittest

from eden_agent_mesh import CRVPolicy, MeshSecurityError
from eden_sparse_agent_tree import SparseAgentTree


class SparseAgentTreeTests(unittest.TestCase):
    def setUp(self):
        self.crv = CRVPolicy(1_000_000, 1_000_000, 1000.0, 60_000)
        self.tree = SparseAgentTree(root_secret=b"z" * 32, root_crv=self.crv, max_depth=12, max_children=1024)

    def test_capacity_matches_closed_form(self):
        expected = (1024 ** 13 - 1) // (1024 - 1)
        self.assertEqual(self.tree.logical_capacity, expected)
        self.assertEqual(self.tree.leaf_capacity, 1024 ** 12)

    def test_maximum_leaf_is_addressable(self):
        leaf = self.tree.maximum_leaf()
        self.assertEqual(leaf.depth, 12)
        self.assertEqual(leaf.path, (1023,) * 12)
        self.assertTrue(leaf.agent_id.startswith("eden-agent:12:"))

    def test_agent_ids_are_deterministic(self):
        path = (1, 22, 333, 444, 555)
        self.assertEqual(self.tree.agent_id(path), self.tree.agent_id(path))

    def test_out_of_range_child_is_rejected(self):
        with self.assertRaises(MeshSecurityError):
            self.tree.agent_id((1024,))

    def test_depth_overflow_is_rejected(self):
        with self.assertRaises(MeshSecurityError):
            self.tree.agent_id((0,) * 13)

    def test_sparse_address_does_not_escalate_crv(self):
        agent = self.tree.virtual_agent((1023,) * 12)
        self.assertEqual(agent.crv, self.crv)


if __name__ == "__main__":
    unittest.main()
