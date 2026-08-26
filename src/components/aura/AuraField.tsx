import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { EarthCanvas } from "./EarthCanvas";
import { Globe2D } from "./Globe2D";
import { FieldEvidence } from "./FieldEvidence";
import { SkyDial } from "./SkyDial";
import { Button } from "@/components/ui/button";
import { selectedTrack, useAura } from "@/lib/aura/store.ts";
import {
  DEFAULT_CARRIER_MHZ,
  MIN_LOCK_ELEVATION_DEG,
  type AuraTab,
  type CameraMode,
  type EvidenceRow,
} from "@/lib/aura/types.ts";
import {
  fmtAz,
  fmtCountdown,
  fmtDb,
  fmtEl,
  fmtHz,
  fmtKm,
  fmtRate,
  fmtScore,
  fmtUtc,
} from "@/lib/aura/format.ts";
import { cn } from "@/lib/utils";
import { EvidenceLabel } from "@/components/eden/evidence-label";
import { POLICY_VERSION, STAGES, sha256Hex, type Marble } from "@/lib/eden";
import { aokDecide, AOK_CAPABILITIES } from "@/lib/aok";
import { lookComet, lookMoon, modelledBodies } from "@/lib/aura/bodies.ts";
import { parseTleBlock } from "@/lib/aura/catalog.ts";
import { useMarbleLedger } from "@/lib/marble-store";

const TABS: AuraTab[] = ["DIAL", "HUNT", "AURA", "EDGE", "MORE"];
const CAMERAS: CameraMode[] = ["GLOBAL", "OBSERVER", "TRACK", "PASS"];

export function AuraField() {
  const tab = useAura((s) => s.tab);
  const setTab = useAura((s) => s.setTab);
  const tick = useAura((s) => s.tick);
  const refreshPasses = useAura((s) => s.refreshPasses);
  const globe2d = useAura((s) => s.globe2d);
  const webglOk = useAura((s) => s.webglOk);

  useEffect(() => {
    refreshPasses();
    tick();
    const id = window.setInterval(() => tick(), 200);
    return () => window.clearInterval(id);
  }, [refreshPasses, tick]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <Link to="/" className="font-sans text-[13px] font-semibold tracking-[0.18em]">
          EDEN
        </Link>
        <span className="font-mono text-[10px] tracking-[0.18em] text-faint">AURA FIELD</span>
        <nav
          className="ml-auto hidden items-center border border-line sm:flex"
          aria-label="AURA FIELD"
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-8 px-3 font-mono text-[10px] tracking-[0.16em]",
                tab === t ? "bg-accent text-accent-fg" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <StatusStrip />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        <section className="relative h-[32dvh] min-h-[200px] border-b border-line lg:h-auto lg:min-h-0 lg:border-b-0 lg:border-r">
          {globe2d || !webglOk ? <Globe2D /> : <EarthCanvas />}
          <CameraDock />
          <TargetHud />
        </section>
        <section className="min-h-0 overflow-y-auto">
          {tab === "DIAL" ? <DialTab /> : null}
          {tab === "HUNT" ? <HuntTab /> : null}
          {tab === "AURA" ? <AuraTab /> : null}
          {tab === "EDGE" ? <EdgeTab /> : null}
          {tab === "MORE" ? <MoreTab /> : null}
        </section>
      </div>

      <nav
        className="grid h-14 shrink-0 grid-cols-5 border-t border-line sm:hidden"
        aria-label="AURA FIELD"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "font-mono text-[10px] tracking-[0.14em]",
              tab === t ? "bg-elevated text-fg" : "text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatusStrip() {
  const observer = useAura((s) => s.observer);
  const edge = useAura((s) => s.edge);
  const now = useAura((s) => s.now);
  const tracks = useAura((s) => s.tracks);
  const above = tracks.filter((t) => t.aboveHorizon).length;
  return (
    <div className="flex gap-px overflow-x-auto border-b border-line bg-line font-mono text-[10px] tracking-[0.12em]">
      <Chip k="ORBIT" v="MODELLED" tone="modelled" />
      <Chip k="PASS" v="PREDICTED" tone="structure" />
      <Chip k="GPS" v={observer.source} tone={observer.source === "SENSOR" ? "keep" : "detail"} />
      <Chip k="DOPPLER" v="MODELLED" tone="modelled" />
      <Chip k="FSPL" v="MODELLED" tone="modelled" />
      <Chip k="RF SIGNAL" v="NOT MEASURED" tone="danger" />
      <Chip k="RF SOURCE" v="NONE" tone="danger" />
      <Chip k="EDGE" v={edge.status} tone={edge.status === "ONLINE" ? "keep" : "faint"} />
      <Chip k="OBJECTS" v={`${above}/${tracks.length} UP`} />
      <Chip k="UTC" v={now ? fmtUtc(new Date(now)) : "—"} />
    </div>
  );
}

function Chip({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone?: "keep" | "modelled" | "structure" | "detail" | "danger" | "faint";
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 bg-bg px-3 py-1.5">
      <span className="text-faint">{k}</span>
      <span
        className={cn(
          "text-fg",
          tone === "keep" && "text-keep",
          tone === "modelled" && "text-modelled",
          tone === "structure" && "text-structure",
          tone === "detail" && "text-detail",
          tone === "danger" && "text-danger",
          tone === "faint" && "text-faint",
        )}
      >
        {v}
      </span>
    </div>
  );
}

function CameraDock() {
  const mode = useAura((s) => s.cameraMode);
  const setCamera = useAura((s) => s.setCamera);
  return (
    <div className="absolute bottom-3 left-3 flex border border-line bg-bg/90">
      {CAMERAS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setCamera(m)}
          className={cn(
            "h-9 px-2 font-mono text-[10px] tracking-[0.12em]",
            mode === m ? "bg-elevated text-fg" : "text-muted",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function TargetHud() {
  const t = useAura((s) => selectedTrack(s));
  const now = useAura((s) => s.now);
  if (!t) return null;
  return (
    <div className="absolute right-3 top-3 max-w-[46%] border border-line bg-bg/90 px-3 py-2">
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint">TARGET</p>
      <p className="mt-0.5 truncate font-mono text-xs text-fg">{t.name}</p>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
        AZ {fmtAz(t.azimuthDeg)} · EL {fmtEl(t.elevationDeg)}
      </p>
      <p className="mt-1 font-mono text-[10px] text-modelled">
        {t.aboveHorizon ? "GEOMETRICALLY VISIBLE" : "BELOW HORIZON"} · MODELLED
      </p>
      {t.pass ? (
        <p className="mt-1 font-mono text-[10px] text-structure">
          NEXT RISE {fmtCountdown(t.pass.rise.getTime() - now)}
        </p>
      ) : null}
    </div>
  );
}

function DialTab() {
  const t = useAura((s) => selectedTrack(s));
  const play = useAura((s) => s.play);
  const now = useAura((s) => s.now);
  const observer = useAura((s) => s.observer);
  const bodies = useMemo(
    () => (now ? modelledBodies(observer, new Date(now)) : []),
    [observer, now],
  );
  if (!t) return <Empty>No object tracked.</Empty>;
  const az = t.azimuthDeg + play.azDeg;
  const el = t.elevationDeg + play.elDeg;
  const playOn = play.azDeg !== 0 || play.elDeg !== 0;
  return (
    <div className="p-4 sm:p-5">
      <p className="label-kicker">DIAL · object control</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium tracking-tight text-fg">{t.name}</h2>
        <span className="font-mono text-[11px] text-faint">NORAD {t.norad}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-modelled">STATE · MODELLED</p>

      <div className="mt-4">
        <SkyDial bodies={bodies} />
      </div>
      {playOn ? (
        <p className="mt-2 text-center font-mono text-[10px] tracking-[0.16em] text-detail">
          PLAY OFFSET APPLIED · not ephemeris
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <KV k="AZ" v={fmtAz(az)} note={playOn ? "PLAY" : "MODELLED"} />
        <KV k="EL" v={fmtEl(el)} note={playOn ? "PLAY" : "MODELLED"} />
        <KV k="RANGE" v={fmtKm(t.rangeKm, 0)} />
        <KV k="RANGE RATE" v={fmtRate(t.rangeRateKmS)} />
        <KV k="VELOCITY" v={`${t.velocityKmS.toFixed(2)} km/s`} />
        <KV k="CARRIER" v={`${t.carrierMhz.toFixed(1)} MHz`} />
        <KV k="DOPPLER" v={fmtHz(t.dopplerHz)} note="MODELLED" />
        <KV k="FSPL" v={fmtDb(t.fsplDb)} note="MODELLED" />
      </div>

      <div className="mt-4 border border-line p-4">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">
          {t.aboveHorizon ? "GEOMETRICALLY VISIBLE" : "BELOW HORIZON"}
        </p>
        {t.geometricLock ? (
          <div className="mt-2">
            <p className="font-mono text-sm tracking-[0.12em] text-keep">GEOMETRIC LOCK</p>
            <p className="mt-1 font-mono text-[11px] text-danger">GEOMETRIC LOCK ≠ RF LOCK</p>
          </div>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-muted">
            Lock criteria: EL ≥ {MIN_LOCK_ELEVATION_DEG}° and range ≤ 2500 km.
          </p>
        )}
      </div>

      {t.pass ? (
        <div className="mt-4 border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="font-mono text-[10px] tracking-[0.16em] text-faint">PASS — PREDICTED</p>
            <p className="font-mono text-[11px] tabular-nums text-fg">
              NEXT CONTACT GEOMETRY {fmtCountdown(t.pass.rise.getTime() - now)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-line">
            <KV k="RISE" v={fmtUtc(t.pass.rise)} note={`AZ ${fmtAz(t.pass.riseAzDeg)}`} />
            <KV k="MAX" v={fmtUtc(t.pass.culmination)} note={`EL ${fmtEl(t.pass.maxElevationDeg)}`} />
            <KV k="SET" v={fmtUtc(t.pass.set)} note={`AZ ${fmtAz(t.pass.setAzDeg)}`} />
          </div>
          <p className="px-3 py-2 font-mono text-[10px] text-faint">
            Not “next RF contact”. Geometry only.
          </p>
        </div>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-faint">No predicted pass in the 12-hour window.</p>
      )}

      <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-faint">
        ORBIT: MODELLED · DOPPLER: MODELLED · FSPL: MODELLED · RF SIGNAL: NOT MEASURED
      </p>
    </div>
  );
}

function HuntTab() {
  const tracks = useAura((s) => s.tracks);
  const selectedId = useAura((s) => s.selectedId);
  const select = useAura((s) => s.select);
  const query = useAura((s) => s.huntQuery);
  const setHuntQuery = useAura((s) => s.setHuntQuery);
  const addTle = useAura((s) => s.addTle);
  const now = useAura((s) => s.now);
  const [tleNote, setTleNote] = useState<string | null>(null);

  const tleCandidate = parseTleBlock(query);
  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tleLike = Boolean(tleCandidate);
    return [...tracks]
      .filter(
        (t) =>
          tleLike ||
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.norad.includes(q) ||
          t.category.toLowerCase().includes(q),
      )
      .sort((a, b) => b.geometryScore - a.geometryScore);
  }, [tracks, query, tleCandidate]);

  return (
    <div className="p-4 sm:p-5">
      <p className="label-kicker">HUNT · acquisition geometry</p>
      <h2 className="mt-2 text-lg font-medium">Ranked by useful geometry, not RF confidence.</h2>
      <textarea
        value={query}
        onChange={(e) => setHuntQuery(e.target.value)}
        placeholder="ISS, STARLINK, NORAD, name — or paste a TLE"
        rows={2}
        className="mt-4 w-full border border-line-strong bg-surface px-3 py-2 font-mono text-xs text-fg"
      />
      {tleCandidate ? (
        <Button
          type="button"
          className="mt-2"
          onClick={() => {
            const ok = addTle(query);
            setTleNote(ok ? `Added ${tleCandidate.name}. MODELLED.` : "Need a 1-line / 2-line TLE pair.");
            if (ok) setHuntQuery("");
          }}
        >
          ADD TLE TO CATALOG
        </Button>
      ) : null}
      {tleNote ? <p className="mt-2 font-mono text-[11px] text-muted">{tleNote}</p> : null}
      <p className="mt-2 font-mono text-[10px] text-faint">GEOMETRIC SCORE — MODELLED</p>
      <ul className="mt-3 border border-line">
        {ranked.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => select(t.id)}
              className={cn(
                "flex w-full min-h-16 items-center justify-between gap-3 border-b border-line px-3 py-2 text-left last:border-b-0",
                t.id === selectedId ? "bg-elevated" : "bg-surface",
              )}
            >
              <div>
                <p className="text-sm text-fg">{t.name}</p>
                <p className="font-mono text-[10px] text-faint">
                  EL {fmtEl(t.elevationDeg)} · AZ {fmtAz(t.azimuthDeg)} · {fmtKm(t.rangeKm, 0)} ·{" "}
                  {t.approaching ? "IN" : "OUT"} {fmtRate(t.rangeRateKmS)}
                </p>
                <p className="font-mono text-[10px] text-modelled">
                  DOPPLER {fmtHz(t.dopplerHz)} · FSPL {fmtDb(t.fsplDb)} · MODELLED
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs tabular-nums text-fg">{fmtScore(t.geometryScore)}</p>
                <p className="font-mono text-[10px] text-faint">
                  {t.geometricLock ? "GEO LOCK" : t.aboveHorizon ? "UP" : "DOWN"}
                </p>
                <p className="font-mono text-[10px] text-structure">
                  {t.pass ? fmtCountdown(t.pass.rise.getTime() - now) : "NO PASS"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-[10px] text-faint">
        Catalog presence does not imply communications capability. Geometric lock ≠ RF lock.
      </p>
    </div>
  );
}

function AuraTab() {
  const t = useAura((s) => selectedTrack(s));
  const observer = useAura((s) => s.observer);
  const edge = useAura((s) => s.edge);
  const now = useAura((s) => s.now);
  const action = useMemo(() => decideAction(t, edge.status === "ONLINE"), [t, edge.status]);
  const aok = aokDecide(
    AOK_CAPABILITIES.find((c) => c.id === "aura-rf") ?? AOK_CAPABILITIES[0],
    "CLAIM_MEASURED",
  );

  return (
    <div className="p-4 sm:p-5">
      <p className="label-kicker">AURA · orbital compute layer</p>
      <h2 className="mt-2 text-lg font-medium">Connect predicted geometry to EDEN scheduling.</h2>
      <p className="mt-2 text-sm text-muted">
        Observer {observer.latDeg.toFixed(3)}°, {observer.lonDeg.toFixed(3)}° · {observer.source}.{" "}
        Target {t?.name ?? "—"}.
      </p>

      <ol className="mt-4 flex flex-wrap gap-1 font-mono text-[10px] tracking-[0.1em] text-faint">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "border border-line px-2 py-1",
              i === (t?.aboveHorizon ? 7 : 5) && "border-accent text-fg",
            )}
          >
            {s.name}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
        <KV k="PREDICTED WINDOW" v={t?.pass ? fmtCountdown(t.pass.rise.getTime() - now) : "—"} note="PREDICTED" />
        <KV
          k="AVAILABLE CAPACITY"
          v={edge.status === "ONLINE" ? "EDGE TELEMETRY" : "UNKNOWN"}
          note="MODELLED unless measured"
        />
        <KV k="CHRONONAV ACTION" v={action.id} note={action.note} />
        <KV k="TX CANDIDATE" v={action.tx} note="MODELLED" />
      </div>
      <p className="mt-2 font-mono text-[10px] text-faint">
        TX does not send to a satellite. No physical communications interface is present.
      </p>

      <div className="mt-5">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">PROGRESSIVE RETURN</p>
        <ul className="mt-2 border border-line">
          {[
            ["F0", "Essential structure", "1.00"],
            ["Δ1", "Highest-value features", "0.72"],
            ["Δ2", "Mission-relevant detail", "0.41"],
            ["Δ3", "Residual fidelity", "0.18"],
          ].map(([id, name, g]) => (
            <li key={id} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-b-0">
              <span className="font-mono text-xs text-fg">
                {id} · {name}
              </span>
              <span className="font-mono text-[11px] text-muted">G = {g} · MODELLED</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[11px] text-muted">PRIORITY F0 → Δ1 → Δ2</p>
      </div>

      <div className="mt-5 border border-line p-3">
        <p className="font-mono text-[10px] tracking-[0.14em] text-danger">AOK · CLAIM MEASURED</p>
        <p className="mt-1 font-mono text-xs text-fg">{aok.verdict} · {aok.rule}</p>
        <p className="mt-1 text-sm text-muted">{aok.note}</p>
      </div>
    </div>
  );
}

function decideAction(t: ReturnType<typeof selectedTrack>, edgeOnline: boolean) {
  if (!t) return { id: "WAIT", tx: "NONE", note: "No target. MODELLED" };
  if (!t.aboveHorizon) return { id: "STORE", tx: "HOLD", note: "Below horizon. MODELLED" };
  if (t.geometricLock && t.approaching) {
    return {
      id: edgeOnline ? "TX" : "CPU",
      tx: "TX CANDIDATE — MODELLED",
      note: "Geometric lock is not RF. MODELLED",
    };
  }
  return { id: "WAIT", tx: "DEFER", note: "Waiting for better geometry. MODELLED" };
}

function EdgeTab() {
  const edge = useAura((s) => s.edge);
  const setEdge = useAura((s) => s.setEdge);
  const observer = useAura((s) => s.observer);
  const setObserver = useAura((s) => s.setObserver);
  const [lat, setLat] = useState(String(observer.latDeg));
  const [lon, setLon] = useState(String(observer.lonDeg));
  const [busy, setBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);

  async function probe() {
    setBusy(true);
    try {
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 1200);
      const res = await fetch("http://127.0.0.1:8765/api/health", { signal: ctrl.signal });
      window.clearTimeout(t);
      if (res.ok) {
        setEdge({
          ...edge,
          status: "ONLINE",
          loopback: true,
          checkedAt: new Date().toISOString(),
          source: "SENSOR",
        });
      } else {
        setEdge({ ...edge, status: "OFFLINE", loopback: false, checkedAt: new Date().toISOString() });
      }
    } catch {
      setEdge({
        ...edge,
        status: "OFFLINE",
        loopback: false,
        checkedAt: new Date().toISOString(),
        batteryPct: null,
        cpuLoad: null,
        memoryPct: null,
        voltage: null,
        currentMa: null,
        source: "NOT MEASURED",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void probe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsErr("Geolocation API unavailable. Observer remains labelled.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude ?? 50) / 1000,
          source: "SENSOR",
        });
        setLat(pos.coords.latitude.toFixed(5));
        setLon(pos.coords.longitude.toFixed(5));
        setGpsErr(null);
      },
      () => setGpsErr("GPS permission denied or unavailable. Observer remains labelled."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <p className="label-kicker">EDGE · physical node</p>
      <h2 className="mt-2 text-lg font-medium">Android / Termux node, if one is actually there.</h2>
      <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
        <KV k="EDGE NODE" v={edge.status} note="local API · never fabricated" />
        <KV k="LOOPBACK" v={edge.loopback ? "LOCKED" : "NONE"} note="LOOPBACK LOCK ≠ RF LOCK" />
        <KV k="BATTERY" v={edge.batteryPct == null ? "—" : `${edge.batteryPct}%`} note={edge.batteryPct == null ? "NOT MEASURED" : "SENSOR"} />
        <KV k="CPU LOAD" v={edge.cpuLoad == null ? "—" : `${edge.cpuLoad}%`} note={edge.cpuLoad == null ? "NOT MEASURED" : "SENSOR"} />
        <KV k="ENERGY" v="—" note="NOT MEASURED" />
        <KV k="RF SOURCE" v="NONE" note="SDR / MODEM / RADIO · NOT MEASURED" />
      </div>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={() => void probe()} disabled={busy}>
          {busy ? "PROBING…" : "PROBE EDGE API"}
        </Button>
      </div>

      <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-faint">OBSERVER</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[11px] text-muted">Latitude</span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="mt-1 h-11 w-full border border-line-strong bg-surface px-3 font-mono text-sm text-fg"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] text-muted">Longitude</span>
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            className="mt-1 h-11 w-full border border-line-strong bg-surface px-3 font-mono text-sm text-fg"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            const la = Number(lat);
            const lo = Number(lon);
            if (Number.isFinite(la) && Number.isFinite(lo)) {
              setObserver({ latDeg: la, lonDeg: lo, source: "MANUAL" });
            }
          }}
        >
          SET MANUAL
        </Button>
        <Button type="button" variant="secondary" onClick={useGps}>
          USE DEVICE GPS
        </Button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted">
        Location source: {observer.source}. Default coordinates are ESTIMATED, never silently called GPS.
      </p>
      {gpsErr ? <p className="mt-2 text-sm text-danger">{gpsErr}</p> : null}
    </div>
  );
}

function MoreTab() {
  const addTle = useAura((s) => s.addTle);
  const catalog = useAura((s) => s.catalog);
  const select = useAura((s) => s.select);
  const globe2d = useAura((s) => s.globe2d);
  const setGlobe2d = useAura((s) => s.setGlobe2d);
  const play = useAura((s) => s.play);
  const setPlay = useAura((s) => s.setPlay);
  const carrier = useAura((s) => s.carrierMhz);
  const setCarrier = useAura((s) => s.setCarrier);
  const t = useAura((s) => selectedTrack(s));
  const now = useAura((s) => s.now);
  const observer = useAura((s) => s.observer);
  const edge = useAura((s) => s.edge);
  const push = useMarbleLedger((s) => s.push);
  const [block, setBlock] = useState("");
  const [tleErr, setTleErr] = useState<string | null>(null);
  const [minted, setMinted] = useState<string | null>(null);

  const moon = useMemo(() => (now ? lookMoon(observer, new Date(now)) : null), [observer, now]);
  const comet = useMemo(() => (now ? lookComet(observer, new Date(now)) : null), [observer, now]);

  const rows: EvidenceRow[] = t
    ? [
        {
          id: "el",
          label: `${t.name} ELEVATION`,
          value: fmtEl(t.elevationDeg),
          source: "SGP4 / curated elements",
          state: "MODELLED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "dop",
          label: "DOPPLER",
          value: fmtHz(t.dopplerHz),
          source: `Δf = −(vr/c)×f0 · ${t.carrierMhz} MHz`,
          state: "MODELLED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "fspl",
          label: "FSPL",
          value: fmtDb(t.fsplDb),
          source: `20log d + 20log f + 32.44`,
          state: "MODELLED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "moon",
          label: "MOON ELEVATION",
          value: moon ? fmtEl(moon.elevationDeg) : "—",
          source: "astronomy-engine",
          state: "MODELLED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "comet",
          label: "2P/ENCKE ELEVATION",
          value: comet ? fmtEl(comet.elevationDeg) : "—",
          source: "Keplerian elements",
          state: "MODELLED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "rf",
          label: "RF RSSI",
          value: "—",
          source: "NO RF SOURCE",
          state: "NOT MEASURED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "pass",
          label: "NEXT PASS",
          value: t.pass ? fmtUtc(t.pass.rise) : "—",
          source: "elevation zero-cross",
          state: "PREDICTED",
          timestamp: fmtUtc(new Date(now)),
        },
        {
          id: "batt",
          label: "DEVICE BATTERY",
          value: edge.batteryPct == null ? "—" : `${edge.batteryPct}%`,
          source: edge.batteryPct == null ? "NO EDGE NODE" : "ANDROID",
          state: edge.batteryPct == null ? "NOT MEASURED" : "SENSOR",
          timestamp: fmtUtc(new Date(now)),
        },
      ]
    : [];

  async function captureMarble() {
    if (!t) return;
    const ts = new Date(now).toISOString();
    const payload = JSON.stringify({
      target: t.name,
      norad: t.norad,
      observer,
      geometry: {
        az: t.azimuthDeg,
        el: t.elevationDeg,
        rangeKm: t.rangeKm,
        state: "MODELLED",
      },
      rf: { rssi: null, state: "NOT MEASURED" },
      play,
    });
    const outHash = await sha256Hex(payload);
    const inHash = await sha256Hex(`${t.id}:${observer.latDeg}:${observer.lonDeg}`);
    const runId = `aura-${t.norad}-${now}`;
    const full = await sha256Hex(`${runId}|${inHash}|${outHash}|${POLICY_VERSION}|${ts}`);
    const marble: Marble = {
      runId,
      sha256: full,
      timestamp: ts,
      inputCommitment: inHash,
      outputCommitment: outHash,
      policyVersion: POLICY_VERSION,
      verificationStatus: "VALID",
      bytesIn: payload.length,
      bytesOut: 0,
      counts: { RAW: 1, KEEP: 0, STRUCTURE: 1, DETAIL: 0, RESIDUAL: 0, VOID: 0 },
      workloadId: `aura:${t.id}`,
      evidence: "MODELLED",
      provenance: [
        "SGP4 / TLE geometry · MODELLED",
        `observer ${observer.source}`,
        "RF SIGNAL · NOT MEASURED",
        "hash proves record integrity, not physical truth",
      ],
      kind: "AURA",
    };
    push(marble);
    setMinted(full.slice(0, 16));
  }

  return (
    <div className="p-4 sm:p-5">
      <p className="label-kicker">MORE · catalog, truth, PLAY</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <EvidenceLabel label="MODELLED" />
        <EvidenceLabel label="NOT MEASURED" />
        <span className="inline-flex items-center border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-detail">
          PLAY
        </span>
      </div>

      <label className="mt-5 block">
        <span className="font-mono text-[11px] text-muted">Paste TLE (name + two lines)</span>
        <textarea
          value={block}
          onChange={(e) => setBlock(e.target.value)}
          rows={4}
          className="mt-1 w-full border border-line-strong bg-surface px-3 py-2 font-mono text-xs text-fg"
        />
      </label>
      <Button
        type="button"
        className="mt-2"
        onClick={() => {
          const ok = addTle(block);
          setTleErr(ok ? null : "Need a 1-line / 2-line TLE pair.");
        }}
      >
        ADD CUSTOM OBJECT
      </Button>
      {tleErr ? <p className="mt-2 text-sm text-danger">{tleErr}</p> : null}

      <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-faint">CATALOG</p>
      <ul className="mt-2 max-h-48 overflow-y-auto border border-line">
        {catalog.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => select(c.id)}
              className="flex min-h-11 w-full items-center justify-between border-b border-line px-3 text-left last:border-b-0"
            >
              <span className="text-sm text-fg">{c.name}</span>
              <span className="font-mono text-[10px] text-faint">{c.category}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="mt-5 block">
        <span className="flex items-center justify-between font-mono text-[11px] text-muted">
          Carrier MHz<span>{carrier.toFixed(1)}</span>
        </span>
        <input
          type="range"
          min={137}
          max={12000}
          step={0.5}
          value={carrier}
          onChange={(e) => setCarrier(Number(e.target.value))}
          className="mt-2 h-11 w-full accent-accent"
        />
        <p className="mt-1 font-mono text-[10px] text-faint">
          Configured frequency for modelled Doppler / FSPL. Not a received carrier. Default {DEFAULT_CARRIER_MHZ} MHz.
        </p>
      </label>

      <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-detail">PLAY OFFSETS · not ephemeris</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[11px] text-muted">AZ PLAY {play.azDeg.toFixed(1)}°</span>
          <input
            type="range"
            min={-30}
            max={30}
            step={0.1}
            value={play.azDeg}
            onChange={(e) => setPlay({ ...play, azDeg: Number(e.target.value) })}
            className="mt-2 h-11 w-full accent-accent"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] text-muted">EL PLAY {play.elDeg.toFixed(1)}°</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.1}
            value={play.elDeg}
            onChange={(e) => setPlay({ ...play, elDeg: Number(e.target.value) })}
            className="mt-2 h-11 w-full accent-accent"
          />
        </label>
      </div>
      <Button type="button" variant="secondary" className="mt-2" onClick={() => setPlay({ azDeg: 0, elDeg: 0 })}>
        CLEAR PLAY
      </Button>

      <label className="mt-5 flex min-h-11 items-center gap-3 font-mono text-xs text-muted">
        <input type="checkbox" checked={globe2d} onChange={(e) => setGlobe2d(e.target.checked)} className="size-4 accent-accent" />
        Use Globe 2D fallback
      </label>

      <div className="mt-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">CAMPAIGN</p>
        <p className="mt-2 text-sm text-muted">
          CAMPAIGN STATUS · NOT YET MEASURED. A simulated pass does not upgrade this.
        </p>
      </div>

      <div className="mt-6 border border-line p-4">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">COMET / BODY · MODELLED</p>
        <div className="mt-3 grid gap-px bg-line sm:grid-cols-2">
          <KV
            k="MOON"
            v={moon ? `${fmtEl(moon.elevationDeg)}  AZ ${fmtAz(moon.azimuthDeg)}` : "—"}
            note={moon ? `${fmtKm(moon.rangeKm, 0)} · astronomy-engine · MODELLED` : "MODELLED"}
          />
          <KV
            k="2P/ENCKE"
            v={comet ? `${fmtEl(comet.elevationDeg)}  AZ ${fmtAz(comet.azimuthDeg)}` : "—"}
            note={comet ? `${fmtKm(comet.rangeKm, 0)} · Keplerian · MODELLED` : "MODELLED"}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
          No Doppler, FSPL or RF claim is computed for a comet. PLAY offsets do not apply here.
        </p>
      </div>

      <div className="mt-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">MARBLE</p>
        <p className="mt-2 text-sm text-muted">
          Capture the current modelled geometry as an EDEN Marble. The hash proves record integrity.
          It does not promote MODELLED to MEASURED.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void captureMarble()} disabled={!t}>
          CAPTURE GEOMETRY MARBLE
        </Button>
        {minted ? (
          <p className="mt-2 font-mono text-[11px] text-keep">
            Minted · MODELLED · {minted}…
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <FieldEvidence rows={rows} />
      </div>
    </div>
  );
}

function KV({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="bg-surface px-3 py-3">
      <p className="font-mono text-[10px] tracking-[0.14em] text-faint">{k}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-fg">{v}</p>
      {note ? <p className="font-mono text-[10px] text-muted">{note}</p> : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-6 font-mono text-sm text-muted">{children}</p>;
}
