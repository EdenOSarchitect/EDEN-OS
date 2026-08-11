import json, hashlib, math

def H(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def canon(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def morton3(x, y, z):
    out = 0
    bit = 0
    while (1 << bit) <= max(x, y, z):
        out |= ((x >> bit) & 1) << (3*bit)
        out |= ((y >> bit) & 1) << (3*bit + 1)
        out |= ((z >> bit) & 1) << (3*bit + 2)
        bit += 1
    return out

def neighbours6(x, y, z, n):
    out = []
    for dx,dy,dz in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)):
        xx, yy, zz = x+dx, y+dy, z+dz
        if 0 <= xx < n and 0 <= yy < n and 0 <= zz < n:
            out.append([xx,yy,zz])
    return out

def build_marble_lattice(n=8, parent_id="EDEN-MARBLE-3D-001"):
    if n < 2 or (n & (n-1)) != 0:
        raise ValueError("n must be a power of two.")
    leaves = []
    for z in range(n):
        for y in range(n):
            for x in range(n):
                body = {
                    "schema":"EDEN-3D-Micro-Marble",
                    "version":"1.0",
                    "parent_id":parent_id,
                    "coord":[x,y,z],
                    "morton_index":morton3(x,y,z),
                    "state":{
                        "role":"MICRO_MARBLE",
                        "active":True,
                        "semantic_mass":1.0,
                        "quality":1.0,
                        "resource_weight":1.0,
                        "evidence_status":"UNPOPULATED"
                    },
                    "neighbours6":neighbours6(x,y,z,n)
                }
                digest = H(b"EDEN-3D-MICRO-v1\x00"+canon(body))
                leaves.append({"coord":[x,y,z],"morton_index":morton3(x,y,z),"hash_sha256":digest,"body":body})
    leaves.sort(key=lambda m:m["morton_index"])
    current = [m["hash_sha256"] for m in leaves]
    levels = [{"level":0,"node_count":len(current),"hashes":current}]
    level=1
    while len(current)>1:
        nxt=[]
        for i in range(0,len(current),8):
            group=current[i:i+8]
            payload=b"".join(bytes.fromhex(h) for h in group)
            nxt.append(H(b"EDEN-3D-OCTREE-v1\x00"+level.to_bytes(2,"big")+payload))
        current=nxt
        levels.append({"level":level,"node_count":len(current),"hashes":current})
        level+=1
    return {
        "schema":"EDEN-3D-Marble-Lattice",
        "version":"1.0",
        "marble_id":parent_id,
        "dimensions":[n,n,n],
        "micro_marble_count":n**3,
        "root_hash_sha256":current[0],
        "micro_marbles":leaves,
        "octree_levels":levels
    }
