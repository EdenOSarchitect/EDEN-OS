import * as satellite from "satellite.js";
import type { SatRec } from "satellite.js";
import { CURATED_CATALOG } from "./catalog.ts";
import {
  C_KM_S,
  DEFAULT_CARRIER_MHZ,
  MAX_LOCK_RANGE_KM,
  MIN_LOCK_ELEVATION_DEG,
  type CatalogEntry,
  type Observer,
  type PassWindow,
  type TrackedSatellite,
} from "./types.ts";

export function fsplDb(rangeKm: number, freqMHz: number): number {
  if (!(rangeKm > 0) || !(freqMHz > 0)) return Number.POSITIVE_INFINITY;
  return 20 * Math.log10(rangeKm) + 20 * Math.log10(freqMHz) + 32.44;
}

export function dopplerHz(rangeRateKmS: number, f0Hz: number): number {
  return -(rangeRateKmS / C_KM_S) * f0Hz;
}

export function satrecFromEntry(entry: CatalogEntry): SatRec | null {
  try {
    if (entry.tle1 && entry.tle2) return satellite.twoline2satrec(entry.tle1, entry.tle2);
    return null;
  } catch {
    return null;
  }
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function look(
  rec: SatRec,
  observer: Observer,
  date: Date,
): {
  az: number;
  el: number;
  rangeKm: number;
  rangeRateKmS: number;
  lat: number;
  lon: number;
  alt: number;
  vel: number;
} | null {
  const pv = satellite.propagate(rec, date);
  if (!pv || typeof pv.position === "boolean" || typeof pv.velocity === "boolean" || !pv.position || !pv.velocity) {
    return null;
  }
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const posEcf = satellite.eciToEcf(pv.position, gmst);
  const velEcf = satellite.eciToEcf(pv.velocity, gmst);
  const observerGd = {
    latitude: satellite.degreesToRadians(observer.latDeg),
    longitude: satellite.degreesToRadians(observer.lonDeg),
    height: observer.altKm,
  };
  const observerEcf = satellite.geodeticToEcf(observerGd);
  const la = satellite.ecfToLookAngles(observerGd, posEcf);
  const dx = posEcf.x - observerEcf.x;
  const dy = posEcf.y - observerEcf.y;
  const dz = posEcf.z - observerEcf.z;
  const r = Math.hypot(dx, dy, dz) || 1;
  const rangeRateKmS = (velEcf.x * dx + velEcf.y * dy + velEcf.z * dz) / r;
  const vel = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
  return {
    az: toDeg(la.azimuth),
    el: toDeg(la.elevation),
    rangeKm: la.rangeSat,
    rangeRateKmS,
    lat: satellite.degreesLat(gd.latitude),
    lon: satellite.degreesLong(gd.longitude),
    alt: gd.height,
    vel,
  };
}

export function predictPass(rec: SatRec, observer: Observer, from: Date): PassWindow | null {
  const stepMs = 20_000;
  const horizon = 12 * 3600 * 1000;
  const samples: { t: number; el: number; az: number }[] = [];
  for (let t = from.getTime() - 20 * 60_000; t <= from.getTime() + horizon; t += stepMs) {
    const s = look(rec, observer, new Date(t));
    if (!s) continue;
    samples.push({ t, el: s.el, az: s.az });
  }
  if (samples.length < 4) return null;

  const windows: PassWindow[] = [];
  let rise: (typeof samples)[0] | null = null;
  let peak = samples[0];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (!rise && prev.el <= 0 && cur.el > 0) {
      rise = cur;
      peak = cur;
    }
    if (rise && cur.el > peak.el) peak = cur;
    if (rise && prev.el > 0 && cur.el <= 0) {
      windows.push({
        rise: new Date(rise.t),
        culmination: new Date(peak.t),
        set: new Date(cur.t),
        maxElevationDeg: peak.el,
        durationSec: (cur.t - rise.t) / 1000,
        riseAzDeg: rise.az,
        setAzDeg: cur.az,
        state: "PREDICTED",
      });
      rise = null;
    }
  }
  if (!windows.length) return null;
  const upcoming = windows.find((w) => w.set.getTime() > from.getTime());
  return upcoming ?? windows[windows.length - 1];
}

export function geometryScore(track: {
  elevationDeg: number;
  rangeKm: number;
  pass: PassWindow | null;
  now: Date;
}): number {
  const elN = Math.max(0, Math.min(1, track.elevationDeg / 90));
  const durN = track.pass ? Math.max(0, Math.min(1, track.pass.durationSec / 600)) : 0;
  const rngN = 1 - Math.max(0, Math.min(1, track.rangeKm / 4000));
  let ttc = 1;
  if (track.pass) {
    const dt = (track.pass.culmination.getTime() - track.now.getTime()) / 1000;
    ttc = dt <= 0 ? 1 : 1 - Math.max(0, Math.min(1, dt / 3600));
  }
  return 0.4 * elN + 0.2 * durN + 0.25 * rngN + 0.15 * ttc;
}

const recCache = new Map<string, SatRec | null>();

export function cachedSatrec(entry: CatalogEntry): SatRec | null {
  const hit = recCache.get(entry.id);
  if (hit !== undefined) return hit;
  const rec = satrecFromEntry(entry);
  recCache.set(entry.id, rec);
  return rec;
}

export function forgetSatrec(id: string) {
  recCache.delete(id);
}

export function trackOne(
  entry: CatalogEntry,
  observer: Observer,
  date: Date,
  carrierMhz: number,
  pass: PassWindow | null,
): TrackedSatellite | null {
  const rec = cachedSatrec(entry);
  if (!rec) return null;
  const s = look(rec, observer, date);
  if (!s) return null;
  const f0 = carrierMhz * 1e6;
  const above = s.el > 0;
  const geometricLock =
    s.el >= MIN_LOCK_ELEVATION_DEG && s.rangeKm <= MAX_LOCK_RANGE_KM && above;
  const draft = {
    elevationDeg: s.el,
    rangeKm: s.rangeKm,
    pass,
    now: date,
  };
  return {
    id: entry.id,
    name: entry.name,
    norad: entry.norad,
    category: entry.category,
    latDeg: s.lat,
    lonDeg: s.lon,
    altitudeKm: s.alt,
    azimuthDeg: ((s.az % 360) + 360) % 360,
    elevationDeg: s.el,
    rangeKm: s.rangeKm,
    rangeRateKmS: s.rangeRateKmS,
    velocityKmS: s.vel,
    dopplerHz: dopplerHz(s.rangeRateKmS, f0),
    fsplDb: fsplDb(s.rangeKm, carrierMhz),
    carrierMhz,
    approaching: s.rangeRateKmS < 0,
    aboveHorizon: above,
    geometricLock,
    geometryScore: geometryScore(draft),
    state: "MODELLED",
    pass,
    epoch: "TLE",
  };
}

export function propagateCatalog(
  catalog: CatalogEntry[],
  observer: Observer,
  date: Date,
  carrierMhz: number,
  passes: Record<string, PassWindow | null>,
): TrackedSatellite[] {
  const out: TrackedSatellite[] = [];
  for (const entry of catalog) {
    const t = trackOne(entry, observer, date, carrierMhz, passes[entry.id] ?? null);
    if (t) out.push(t);
  }
  return out;
}

export function computePasses(
  catalog: CatalogEntry[],
  observer: Observer,
  date: Date,
): Record<string, PassWindow | null> {
  const out: Record<string, PassWindow | null> = {};
  for (const entry of catalog) {
    const rec = cachedSatrec(entry);
    out[entry.id] = rec ? predictPass(rec, observer, date) : null;
  }
  return out;
}

export function orbitSamples(entry: CatalogEntry, date: Date, n = 72): { lat: number; lon: number; alt: number }[] {
  const rec = cachedSatrec(entry);
  if (!rec) return [];
  const periodMs = (92 * 60 * 1000);
  const pts: { lat: number; lon: number; alt: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(date.getTime() + (i / n) * periodMs);
    const pv = satellite.propagate(rec, t);
    if (!pv || typeof pv.position === "boolean" || !pv.position) continue;
    const gmst = satellite.gstime(t);
    const gd = satellite.eciToGeodetic(pv.position, gmst);
    pts.push({
      lat: satellite.degreesLat(gd.latitude),
      lon: satellite.degreesLong(gd.longitude),
      alt: gd.height,
    });
  }
  return pts;
}

export function latLonAltToXYZ(lat: number, lon: number, altKm: number, scale = 1) {
  const r = scale * (1 + altKm / 6371);
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return {
    x: r * Math.cos(latR) * Math.cos(lonR),
    y: r * Math.sin(latR),
    z: r * Math.cos(latR) * Math.sin(lonR),
  };
}

export function sunDirection(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const doy = (date.getTime() - start) / 86400000;
  const decl = 23.44 * Math.sin((2 * Math.PI * (doy - 81)) / 365);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lon = 15 * (hour - 12);
  return latLonAltToXYZ(decl, -lon, 0, 1);
}

export const DEFAULT_CATALOG = CURATED_CATALOG;
export { DEFAULT_CARRIER_MHZ };
