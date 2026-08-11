import json, hashlib, itertools

def H(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def canon(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def nd_neighbors(coord, side):
    out=[]
    for axis in range(len(coord)):
        for step in (-1,1):
            c=list(coord); c[axis]+=step
            if 0 <= c[axis] < side:
                out.append(c)
    return out

def morton_nd(coord):
    bits=max(1,max(coord).bit_length()); d=len(coord); out=0
    for bit in range(bits):
        for axis in range(d):
            out |= ((coord[axis] >> bit) & 1) << (bit*d + axis)
    return out

def evolve_state(state, neighbour_states, alpha=0.15):
    nxt=dict(state)
    if not neighbour_states:
        return nxt
    for key in ("semantic_mass","quality","resource_weight","stability","provenance_density"):
        avg=sum(n[key] for n in neighbour_states)/len(neighbour_states)
        nxt[key]=(1-alpha)*state[key]+alpha*avg
    nxt["uncertainty"]=min(1.0,(1-alpha)*state["uncertainty"]+
        alpha*sum(n["uncertainty"] for n in neighbour_states)/len(neighbour_states))
    return nxt
