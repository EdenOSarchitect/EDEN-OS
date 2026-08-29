import {
  Body,
  Equator,
  EquatorFromVector,
  HelioVector,
  Horizon,
  KM_PER_AU,
  MakeTime,
  Observer,
  RotateVector,
  Rotation_ECL_EQJ,
  SiderealTime,
  Vector,
} from "astronomy-engine";
import type { Observer as AuraObserver } from "./types.ts";

export interface ModelledBody {
  id: string;
  name: string;
  kind: "MOON" | "COMET";
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  raHours: number;
  decDeg: number;
  aboveHorizon: boolean;
  state: "MODELLED";
}

export interface Subsolar {
  latDeg: number;
  lonDeg: number;
  state: "MODELLED";
}

function astroObserver(o: AuraObserver) {
  return new Observer(o.latDeg, o.lonDeg, o.altKm * 1000);
}

/** Moon look angles from astronomy-engine. MODELLED — not a detection. */
export function lookMoon(observer: AuraObserver, date: Date): ModelledBody {
  const obs = astroObserver(observer);
  const eq = Equator(Body.Moon, date, obs, true, true);
  const hor = Horizon(date, obs, eq.ra, eq.dec, "normal");
  return {
    id: "moon",
    name: "MOON",
    kind: "MOON",
    azimuthDeg: ((hor.azimuth % 360) + 360) % 360,
    elevationDeg: hor.altitude,
    rangeKm: eq.dist * KM_PER_AU,
    raHours: eq.ra,
    decDeg: eq.dec,
    aboveHorizon: hor.altitude > 0,
    state: "MODELLED",
  };
}

/**
 * 2P/Encke — published Keplerian elements, two-body heliocentric.
 * MODELLED. No carrier, Doppler, FSPL or RF claim is computed.
 */
const ENCKE = {
  a: 2.2151,
  e: 0.8483,
  iDeg: 11.781,
  nodeDeg: 334.569,
  periDeg: 186.547,
  perihelionMs: Date.UTC(2023, 9, 22, 14, 0, 0),
};

function keplerE(M: number, e: number) {
  let E = M;
  for (let n = 0; n < 14; n++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function heliocentricEclipticAu(date: Date) {
  const gauss = 0.01720209895;
  const n = gauss / Math.pow(ENCKE.a, 1.5);
  const dtDays = (date.getTime() - ENCKE.perihelionMs) / 86_400_000;
  let M = n * dtDays;
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  const E = keplerE(M, ENCKE.e);
  const x = ENCKE.a * (Math.cos(E) - ENCKE.e);
  const y = ENCKE.a * Math.sqrt(1 - ENCKE.e * ENCKE.e) * Math.sin(E);
  const w = (ENCKE.periDeg * Math.PI) / 180;
  const O = (ENCKE.nodeDeg * Math.PI) / 180;
  const i = (ENCKE.iDeg * Math.PI) / 180;
  const x1 = x * Math.cos(w) - y * Math.sin(w);
  const y1 = x * Math.sin(w) + y * Math.cos(w);
  const xe = x1;
  const ye = y1 * Math.cos(i);
  const ze = y1 * Math.sin(i);
  return {
    x: xe * Math.cos(O) - ye * Math.sin(O),
    y: xe * Math.sin(O) + ye * Math.cos(O),
    z: ze,
  };
}

export function lookComet(observer: AuraObserver, date: Date): ModelledBody {
  const time = MakeTime(date);
  const ecl = heliocentricEclipticAu(date);
  const eclVec = new Vector(ecl.x, ecl.y, ecl.z, time);
  const eqj = RotateVector(Rotation_ECL_EQJ(), eclVec);
  const earth = HelioVector(Body.Earth, date);
  const geo = new Vector(eqj.x - earth.x, eqj.y - earth.y, eqj.z - earth.z, time);
  const eq = EquatorFromVector(geo);
  const obs = astroObserver(observer);
  const hor = Horizon(date, obs, eq.ra, eq.dec, "normal");
  return {
    id: "encke",
    name: "2P/ENCKE",
    kind: "COMET",
    azimuthDeg: ((hor.azimuth % 360) + 360) % 360,
    elevationDeg: hor.altitude,
    rangeKm: geo.Length() * KM_PER_AU,
    raHours: eq.ra,
    decDeg: eq.dec,
    aboveHorizon: hor.altitude > 0,
    state: "MODELLED",
  };
}

/** Subsolar point from astronomy-engine. Used for terminator lighting. MODELLED. */
export function subsolarPoint(date: Date): Subsolar {
  const dummy = new Observer(0, 0, 0);
  const eq = Equator(Body.Sun, date, dummy, true, true);
  const gst = SiderealTime(date);
  let lon = (eq.ra - gst) * 15;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { latDeg: eq.dec, lonDeg: lon, state: "MODELLED" };
}

export function modelledBodies(observer: AuraObserver, date: Date): ModelledBody[] {
  return [lookMoon(observer, date), lookComet(observer, date)];
}
