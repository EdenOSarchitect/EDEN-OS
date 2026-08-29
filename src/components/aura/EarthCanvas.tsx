import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { latLonAltToXYZ, orbitSamples } from "@/lib/aura/track.ts";
import { subsolarPoint } from "@/lib/aura/bodies.ts";
import { selectedTrack, useAura } from "@/lib/aura/store.ts";
import { CURATED_CATALOG } from "@/lib/aura/catalog.ts";

function latLonLine(lat: boolean, value: number, segs = 64) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const p = lat
      ? latLonAltToXYZ(value, (a * 180) / Math.PI - 180, 0, 1.002)
      : latLonAltToXYZ((a * 180) / Math.PI - 90, value, 0, 1.002);
    pts.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  return pts;
}

function EarthGrid() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (const p of latLonLine(true, lat)) positions.push(p.x, p.y, p.z);
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (const p of latLonLine(false, lon, 48)) positions.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#2a333c" transparent opacity={0.7} />
    </lineSegments>
  );
}

function EarthBody() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial color="#14191f" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.012, 32, 24]} />
        <meshBasicMaterial color="#7e93a8" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      <EarthGrid />
    </group>
  );
}

function Terminator() {
  const now = useAura((s) => s.now);
  const minute = Math.floor(now / 60_000);
  const pts = useMemo(() => {
    const sun = subsolarPoint(new Date(minute * 60_000));
    const s0 = latLonAltToXYZ(sun.latDeg, sun.lonDeg, 0, 1);
    const s = new THREE.Vector3(s0.x, s0.y, s0.z).normalize();
    const up = Math.abs(s.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(s, up).normalize();
    const v = new THREE.Vector3().crossVectors(s, u).normalize();
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      ring.push(
        u
          .clone()
          .multiplyScalar(Math.cos(a) * 1.004)
          .add(v.clone().multiplyScalar(Math.sin(a) * 1.004)),
      );
    }
    return ring;
  }, [minute]);
  return <Line points={pts} color="#a3926e" transparent opacity={0.38} lineWidth={1} />;
}

function Satellites() {
  const tracks = useAura((s) => s.tracks);
  const selectedId = useAura((s) => s.selectedId);
  const select = useAura((s) => s.select);
  return (
    <group>
      {tracks.map((t) => {
        const p = latLonAltToXYZ(t.latDeg, t.lonDeg, t.altitudeKm);
        const sel = t.id === selectedId;
        return (
          <mesh
            key={t.id}
            position={[p.x, p.y, p.z]}
            onClick={(e) => {
              e.stopPropagation();
              select(t.id);
            }}
          >
            <sphereGeometry args={[sel ? 0.028 : 0.016, 10, 8]} />
            <meshBasicMaterial
              color={sel ? "#c5cdd6" : t.aboveHorizon ? "#7d9a84" : "#5c636b"}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ObserverMark() {
  const observer = useAura((s) => s.observer);
  const p = latLonAltToXYZ(observer.latDeg, observer.lonDeg, 0);
  return (
    <mesh position={[p.x, p.y, p.z]}>
      <octahedronGeometry args={[0.03, 0]} />
      <meshBasicMaterial color="#b59a6a" />
    </mesh>
  );
}

function LookLine() {
  const s = useAura((st) => selectedTrack(st));
  const observer = useAura((st) => st.observer);
  const points = useMemo(() => {
    if (!s) {
      return [new THREE.Vector3(), new THREE.Vector3()] as [THREE.Vector3, THREE.Vector3];
    }
    const a = latLonAltToXYZ(observer.latDeg, observer.lonDeg, 0);
    const b = latLonAltToXYZ(s.latDeg, s.lonDeg, s.altitudeKm);
    return [new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)] as [
      THREE.Vector3,
      THREE.Vector3,
    ];
  }, [s, observer]);
  return <Line points={points} color="#7e93a8" transparent opacity={0.65} lineWidth={1} />;
}

function OrbitTrail() {
  const selectedId = useAura((s) => s.selectedId);
  const catalog = useAura((s) => s.catalog);
  const now = useAura((s) => s.now);
  const entry = catalog.find((c) => c.id === selectedId) ?? CURATED_CATALOG[0];
  const period = Math.floor(now / 15000);
  const pts = useMemo(() => orbitSamples(entry, new Date(now), 80), [entry, period]);
  const orbit = useMemo(
    () =>
      pts.map((p) => {
        const v = latLonAltToXYZ(p.lat, p.lon, p.alt);
        return new THREE.Vector3(v.x, v.y, v.z);
      }),
    [pts],
  );
  const ground = useMemo(
    () =>
      pts.map((p) => {
        const v = latLonAltToXYZ(p.lat, p.lon, 0);
        return new THREE.Vector3(v.x, v.y, v.z);
      }),
    [pts],
  );
  if (orbit.length < 2) return null;
  return (
    <group>
      <Line points={orbit} color="#4a5560" transparent opacity={0.8} lineWidth={1} />
      <Line points={ground} color="#323840" transparent opacity={0.55} lineWidth={1} />
    </group>
  );
}

function Lights() {
  const now = useAura((s) => s.now);
  const minute = Math.floor(now / 60000);
  const sun = useMemo(() => {
    const sub = subsolarPoint(new Date(minute * 60000));
    return latLonAltToXYZ(sub.latDeg, sub.lonDeg, 0, 1);
  }, [minute]);
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight position={[sun.x * 8, sun.y * 8, sun.z * 8]} intensity={1.45} color="#e8e0d2" />
    </>
  );
}

function CameraRig() {
  const mode = useAura((s) => s.cameraMode);
  const observer = useAura((s) => s.observer);
  const track = useAura((s) => selectedTrack(s));
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    if (mode === "GLOBAL") return;
    const obs = latLonAltToXYZ(observer.latDeg, observer.lonDeg, 0);
    const sat = track ? latLonAltToXYZ(track.latDeg, track.lonDeg, track.altitudeKm) : obs;
    let desired = new THREE.Vector3(0, 1.2, 3.2);
    if (mode === "OBSERVER") {
      desired.set(obs.x, obs.y, obs.z).multiplyScalar(2.1);
      target.current.set(obs.x, obs.y, obs.z);
    } else if (mode === "TRACK") {
      desired.set(sat.x, sat.y, sat.z).multiplyScalar(1.55);
      target.current.set(sat.x, sat.y, sat.z);
    } else if (mode === "PASS") {
      desired.set((obs.x + sat.x) * 0.7, (obs.y + sat.y) * 0.7 + 0.45, (obs.z + sat.z) * 0.7);
      target.current.set((obs.x + sat.x) / 2, (obs.y + sat.y) / 2, (obs.z + sat.z) / 2);
    }
    camera.position.lerp(desired, 1 - Math.exp(-3.2 * d));
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    const look = target.current.clone().sub(camera.position).normalize();
    const next = cur.lerp(look, 1 - Math.exp(-3.2 * d));
    camera.lookAt(camera.position.clone().add(next));
  });
  return null;
}

export function EarthCanvas() {
  const mode = useAura((s) => s.cameraMode);
  const setWebglOk = useAura((s) => s.setWebglOk);
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.15, 3.15], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#08090b");
      }}
      onPointerMissed={() => undefined}
      fallback={null}
    >
      <color attach="background" args={["#08090b"]} />
      <Lights />
      <EarthBody />
      <Terminator />
      <ObserverMark />
      <Satellites />
      <LookLine />
      <OrbitTrail />
      <CameraRig />
      {mode === "GLOBAL" ? (
        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={6}
          enableDamping
          dampingFactor={0.08}
        />
      ) : null}
      <WebglWatch onFail={() => setWebglOk(false)} />
    </Canvas>
  );
}

function WebglWatch({ onFail }: { onFail: () => void }) {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    const lost = gl.getContext().isContextLost();
    if (lost) onFail();
  });
  return null;
}
