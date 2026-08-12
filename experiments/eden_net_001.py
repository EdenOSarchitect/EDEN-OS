import json, hashlib, random, time, os, statistics, copy, heapq
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

SEED=20260812
N=1024
M=3000
rng=random.Random(SEED)

def canon(o): return json.dumps(o,sort_keys=True,separators=(",",":")).encode()
def H(b): return hashlib.sha256(b).hexdigest()
def merkle(hs):
    if not hs: return H(b"empty")
    layer=[bytes.fromhex(x) for x in hs]
    while len(layer)>1:
        if len(layer)%2: layer.append(layer[-1])
        layer=[hashlib.sha256(b"EDEN-NET\x00"+layer[i]+layer[i+1]).digest() for i in range(0,len(layer),2)]
    return layer[0].hex()

nodes={}; keys={}; adj={i:set() for i in range(N)}
for i in range(N):
    nodes[i]={"lat":0.5+rng.random()*4.5,"cost":0.5+rng.random()*1.5,"energy":0.5+rng.random()*1.5,
              "rel":0.985+rng.random()*0.014,"sec":0.90+rng.random()*0.10,"failed":False}
    keys[i]=Ed25519PrivateKey.generate()
for i in range(N):
    for d in (1,2,4,8):
        adj[i].add((i+d)%N); adj[i].add((i-d)%N)
    base=(i//128)*128
    for _ in range(2):
        j=base+rng.randrange(128)
        if j!=i: adj[i].add(j)
    for _ in range(2):
        j=rng.randrange(N)
        if j!=i: adj[i].add(j)
for i in range(N):
    for j in list(adj[i]): adj[j].add(i)
failed=set(rng.sample(range(N),25))
for i in failed: nodes[i]["failed"]=True
edges=[(i,j) for i in range(N) for j in adj[i] if i<j]
cong={}
for e in rng.sample(edges,min(200,len(edges))): cong[e]=rng.uniform(0.5,3.0)
policy={"min_rel":0.985,"min_sec":0.90,"wl":0.55,"wc":0.15,"we":0.20,"wr":0.10}

def em(a,b):
    na,nb=nodes[a],nodes[b]; c=cong.get((min(a,b),max(a,b)),0)
    lat=(na["lat"]+nb["lat"])/2*(1+c); cost=(na["cost"]+nb["cost"])/2; en=(na["energy"]+nb["energy"])/2
    rel=min(na["rel"],nb["rel"]); sec=min(na["sec"],nb["sec"])
    return lat,cost,en,rel,sec

def route(s,t):
    pq=[(0,s,())]; best={s:0}
    while pq:
        sc,u,path=heapq.heappop(pq)
        if u==t: return list(path)+[u],sc
        if sc>best.get(u,1e99): continue
        for v in adj[u]:
            if nodes[v]["failed"]: continue
            lat,cost,en,rel,sec=em(u,v)
            if rel<policy["min_rel"] or sec<policy["min_sec"]: continue
            step=policy["wl"]*lat+policy["wc"]*cost+policy["we"]*en+policy["wr"]*(1-rel)
            ns=sc+step
            if ns<best.get(v,1e99):
                best[v]=ns; heapq.heappush(pq,(ns,v,path+(u,)))
    return None,None

seen=set()
def make_delegation(s,r):
    body={"sender":s,"receiver":r,"task":"deliver","nonce":H(os.urandom(12))[:24],"expiry":time.time()+3600}
    return {"body":body,"signature":keys[s].sign(canon(body)).hex()}
def verify_del(d):
    b=d["body"]
    if b["nonce"] in seen: return False,"REPLAY"
    if time.time()>b["expiry"]: return False,"EXPIRED"
    try: keys[b["sender"]].public_key().verify(bytes.fromhex(d["signature"]),canon(b))
    except Exception: return False,"BAD_SIGNATURE"
    seen.add(b["nonce"]); return True,"OK"

marbles=[]; payload_total=0; ev_total=0; lats=[]; hops=[]; delivered=0
t0=time.perf_counter()
for _ in range(M):
    s=rng.randrange(N); t=rng.randrange(N)
    while s==t or nodes[s]["failed"] or nodes[t]["failed"]:
        s=rng.randrange(N); t=rng.randrange(N)
    payload=os.urandom(rng.randint(128,4096)); payload_total+=len(payload)
    d=make_delegation(s,t); ok,_=verify_del(d); p,score=route(s,t) if ok else (None,None)
    if p:
        delivered+=1; hops.append(len(p)-1); lats.append(sum(em(a,b)[0] for a,b in zip(p,p[1:])))
    body={"sender":s,"receiver":t,"payload_hash":H(payload),"payload_bytes":len(payload),"path":p,"route_score":score,
          "policy":policy,"delegation_hash":H(canon(d["body"])),"delivered":bool(p)}
    mh=H(b"EDEN-NET-MESSAGE-v1\x00"+canon(body)); marbles.append({"body":body,"hash_sha256":mh}); ev_total+=len(canon(body))+32
elapsed=time.perf_counter()-t0; root=merkle([x["hash_sha256"] for x in marbles])

tests=[]
def T(n,v,detail=""): tests.append({"name":n,"passed":bool(v),"detail":detail})
x=copy.deepcopy(marbles[0]); old=x["hash_sha256"]; x["body"]["payload_bytes"]+=1
T("tamper_detected",H(b"EDEN-NET-MESSAGE-v1\x00"+canon(x["body"]))!=old)
seen.clear(); d=make_delegation(1,2); d2=copy.deepcopy(d); bs=bytearray.fromhex(d2["signature"]); bs[0]^=1; d2["signature"]=bs.hex(); T("forged_signature_rejected",not verify_del(d2)[0])
seen.clear(); d=make_delegation(3,4); a=verify_del(d); b=verify_del(d); T("replay_rejected",a[0] and not b[0] and b[1]=="REPLAY")
seen.clear(); d=make_delegation(5,6); d["body"]["expiry"]=time.time()-1; T("expired_rejected",not verify_del(d)[0])
mut=[x["hash_sha256"] for x in marbles]; mut[100]=H(b"mut"); T("merkle_mutation_changes_root",merkle(mut)!=root)
T("merkle_deterministic",merkle([x["hash_sha256"] for x in marbles])==root)
T("delivery_rate_over_99pct",delivered/M>=0.99,delivered/M)

report={"schema":"EDEN-NET-001","version":"1.0","scenario":{"nodes":N,"messages":M,"failed_nodes":len(failed),"congested_edges":len(cong),"simulation_only":True},
"results":{"delivered":delivered,"delivery_rate":delivered/M,"avg_hops":statistics.mean(hops),"avg_route_latency_ms":statistics.mean(lats),
"p95_route_latency_ms":statistics.quantiles(lats,n=20)[18],"local_routing_throughput_msg_s":M/elapsed,"payload_bytes_total":payload_total,
"evidence_bytes_total":ev_total,"avg_payload_bytes":payload_total/M,"avg_evidence_bytes_per_message":ev_total/M,"evidence_to_payload_ratio":ev_total/payload_total,
"network_evidence_root_sha256":root},"tests":{"passed":sum(t["passed"] for t in tests),"total":len(tests),"all_pass":all(t["passed"] for t in tests),"details":tests},
"truth_boundary":{"live_network_touched":False,"real_telecom_or_satellite_links":False,"independent_validation":False,"economic_savings_proven":False}}
print(json.dumps(report,indent=2))
