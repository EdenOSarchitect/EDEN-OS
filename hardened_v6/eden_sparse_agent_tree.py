from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from typing import Iterable, Tuple

from eden_agent_mesh import CRVPolicy, MeshSecurityError


@dataclass(frozen=True)
class VirtualAgent:
    agent_id: str
    path: Tuple[int, ...]
    depth: int
    crv: CRVPolicy


class SparseAgentTree:
    """Maximum-capacity logical EDEN agent tree.

    The address space is complete but sparse: valid agent positions are derived
    deterministically and materialized only when used. This avoids allocating
    an impossible number of Python objects while preserving the bounded tree.
    """

    def __init__(self, *, root_secret: bytes, root_crv: CRVPolicy, max_depth: int = 12, max_children: int = 1024):
        if len(root_secret) < 32:
            raise MeshSecurityError("sparse tree requires >=256-bit derivation secret")
        if max_depth < 1 or max_children < 1:
            raise MeshSecurityError("invalid sparse tree bounds")
        self._secret = root_secret
        self.root_crv = root_crv
        self.max_depth = max_depth
        self.max_children = max_children

    @property
    def logical_capacity(self) -> int:
        return sum(self.max_children ** d for d in range(self.max_depth + 1))

    @property
    def leaf_capacity(self) -> int:
        return self.max_children ** self.max_depth

    def validate_path(self, path: Iterable[int]) -> Tuple[int, ...]:
        p = tuple(path)
        if len(p) > self.max_depth:
            raise MeshSecurityError("agent path exceeds maximum depth")
        if any((not isinstance(index, int)) or index < 0 or index >= self.max_children for index in p):
            raise MeshSecurityError("agent child index outside configured fanout")
        return p

    def agent_id(self, path: Iterable[int]) -> str:
        p = self.validate_path(path)
        encoded = "eden-root/" + "/".join(f"{index:04d}" for index in p)
        digest = hmac.new(self._secret, encoded.encode(), hashlib.sha256).hexdigest()
        return f"eden-agent:{len(p)}:{digest}"

    def derive_crv(self, path: Iterable[int]) -> CRVPolicy:
        """Derive a non-escalating CRV policy for a virtual position.

        v1 preserves the root ceilings at every logical position; an agent may
        only receive a smaller explicit budget when it is materialized in the
        live AgentMesh. This guarantees sparse addressing cannot itself grant
        additional resources or weaken evidence requirements.
        """
        self.validate_path(path)
        return self.root_crv

    def virtual_agent(self, path: Iterable[int]) -> VirtualAgent:
        p = self.validate_path(path)
        return VirtualAgent(self.agent_id(p), p, len(p), self.derive_crv(p))

    def maximum_leaf(self) -> VirtualAgent:
        return self.virtual_agent((self.max_children - 1,) * self.max_depth)
