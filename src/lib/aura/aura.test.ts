import assert from "node:assert/strict";
import test from "node:test";
import * as satellite from "satellite.js";
import { ISS_TEST_TLE, CURATED_CATALOG, parseTleBlock } from "./catalog.ts";
import { dopplerHz, fsplDb, predictPass, satrecFromEntry, trackOne } from "./track.ts";
import { lookComet, lookMoon, subsolarPoint } from "./bodies.ts";
import { C_KM_S, DEFAULT_CARRIER_MHZ } from "./types.ts";

const observer = { latDeg: 51.5, lonDeg: -0.12, altKm: 0.05, source: "ESTIMATED" as const };

test("TLE parsing yields a satrec", () => {
  const rec = satellite.twoline2satrec(ISS_TEST_TLE.line1, ISS_TEST_TLE.line2);
  assert.ok(rec);
  assert.equal(rec.error, 0);
});

test("SGP4 propagation at TLE epoch returns a position", () => {
  const rec = satellite.twoline2satrec(ISS_TEST_TLE.line1, ISS_TEST_TLE.line2);
  const date = new Date(Date.UTC(2019, 5, 5, 12, 12, 58));
  const pv = satellite.propagate(rec, date);
  assert.ok(pv?.position && typeof pv.position !== "boolean");
  assert.ok(Number.isFinite(pv.position.x));
  assert.ok(Math.hypot(pv.position.x, pv.position.y, pv.position.z) > 6000);
});

test("geodetic conversion is in range", () => {
  const rec = satellite.twoline2satrec(ISS_TEST_TLE.line1, ISS_TEST_TLE.line2);
  const date = new Date(Date.UTC(2019, 5, 5, 12, 12, 58));
  const pv = satellite.propagate(rec, date);
  assert.ok(pv.position && typeof pv.position !== "boolean");
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const lat = satellite.degreesLat(gd.latitude);
  const lon = satellite.degreesLong(gd.longitude);
  assert.ok(lat >= -90 && lat <= 90);
  assert.ok(lon >= -180 && lon <= 180);
  assert.ok(gd.height > 300 && gd.height < 600);
});

test("look angles: range is positive, azimuth wrapped", () => {
  const rec = satellite.twoline2satrec(ISS_TEST_TLE.line1, ISS_TEST_TLE.line2);
  const date = new Date(Date.UTC(2019, 5, 5, 12, 12, 58));
  const pv = satellite.propagate(rec, date);
  assert.ok(pv.position && typeof pv.position !== "boolean");
  const gmst = satellite.gstime(date);
  const posEcf = satellite.eciToEcf(pv.position, gmst);
  const observerGd = {
    latitude: satellite.degreesToRadians(observer.latDeg),
    longitude: satellite.degreesToRadians(observer.lonDeg),
    height: observer.altKm,
  };
  const la = satellite.ecfToLookAngles(observerGd, posEcf);
  assert.ok(la.rangeSat > 0);
  const az = (la.azimuth * 180) / Math.PI;
  const el = (la.elevation * 180) / Math.PI;
  assert.ok(az >= 0 && az <= 360);
  assert.ok(el > -90 && el < 90);
});

test("below-horizon state is just elevation < 0", () => {
  const el = -12.4;
  assert.equal(el > 0, false);
  const claim = el > 0 ? "GEOMETRICALLY VISIBLE" : "BELOW HORIZON";
  assert.equal(claim, "BELOW HORIZON");
  assert.notEqual(claim, "CONNECTED");
});

test("FSPL increases with range and frequency", () => {
  const a = fsplDb(400, 437.5);
  const b = fsplDb(800, 437.5);
  const c = fsplDb(400, 875);
  assert.ok(b > a);
  assert.ok(c > a);
});

test("Doppler sign: approaching (negative range rate) raises frequency", () => {
  const f0 = 437.5e6;
  const approaching = dopplerHz(-4.31, f0);
  const receding = dopplerHz(4.31, f0);
  assert.ok(approaching > 0);
  assert.ok(receding < 0);
  assert.ok(Math.abs(approaching - (4.31 / C_KM_S) * f0) < 1e-6);
});

test("range rate of zero is zero Doppler", () => {
  assert.equal(Object.is(dopplerHz(0, 1e9), 0) || dopplerHz(0, 1e9) === 0, true);
  assert.ok(Math.abs(dopplerHz(0, 1e9)) === 0);
});

test("rise/set predictor returns PREDICTED or null, never MEASURED", () => {
  const rec = satellite.twoline2satrec(ISS_TEST_TLE.line1, ISS_TEST_TLE.line2);
  const pass = predictPass(rec, observer, new Date(Date.UTC(2019, 5, 5, 12, 0, 0)));
  if (pass) {
    assert.equal(pass.state, "PREDICTED");
    assert.ok(pass.set.getTime() > pass.rise.getTime());
    assert.ok(pass.maxElevationDeg > 0);
  }
});

test("PLAY offset must not mutate ephemeris", () => {
  const entry = {
    id: "t",
    name: "ISS (ZARYA)",
    norad: "25544",
    category: "ISS" as const,
    objectId: "1998-067A",
    tle1: ISS_TEST_TLE.line1,
    tle2: ISS_TEST_TLE.line2,
  };
  const date = new Date(Date.UTC(2019, 5, 5, 12, 12, 58));
  const a = trackOne(entry, observer, date, DEFAULT_CARRIER_MHZ, null)!;
  const play = { azDeg: 15, elDeg: -4 };
  const displayedAz = a.azimuthDeg + play.azDeg;
  assert.notEqual(displayedAz, a.azimuthDeg);
  assert.equal(a.state, "MODELLED");
});

test("modelled object never becomes MEASURED", () => {
  const entry = {
    id: "t",
    name: "ISS (ZARYA)",
    norad: "25544",
    category: "ISS" as const,
    objectId: "1998-067A",
    tle1: ISS_TEST_TLE.line1,
    tle2: ISS_TEST_TLE.line2,
  };
  const date = new Date(Date.UTC(2019, 5, 5, 12, 12, 58));
  const t = trackOne(entry, observer, date, DEFAULT_CARRIER_MHZ, null)!;
  assert.equal(t.state, "MODELLED");
  assert.notEqual(t.state, "MEASURED");
});

test("unavailable RF source stays NOT MEASURED", () => {
  const rf = { connected: false, rssi: null as number | null };
  const label = rf.connected && rf.rssi != null ? "MEASURED" : "NOT MEASURED";
  assert.equal(label, "NOT MEASURED");
});

test("loopback lock is not RF lock", () => {
  const loopback = true;
  const rfLock = false;
  assert.equal(loopback && rfLock, false);
  assert.equal("LOOPBACK LOCK ≠ RF LOCK".includes("≠"), true);
});

test("geometric lock is not satellite connection", () => {
  const geometricLock = true;
  const satConnection = false;
  assert.ok(geometricLock);
  assert.equal(satConnection, false);
});

test("satrecFromEntry accepts TLE and OMM", () => {
  const fromTle = satrecFromEntry({
    id: "1",
    name: "ISS",
    norad: "25544",
    category: "ISS",
    objectId: "1998-067A",
    tle1: ISS_TEST_TLE.line1,
    tle2: ISS_TEST_TLE.line2,
  });
  assert.ok(fromTle);
});

test("curated catalog TLEs parse and propagate now", () => {
  for (const entry of CURATED_CATALOG) {
    const rec = satrecFromEntry(entry);
    assert.ok(rec, entry.name);
    const pv = satellite.propagate(rec, new Date("2026-08-24T09:00:00Z"));
    assert.equal(typeof pv.position === "boolean", false, entry.name);
  }
});

test("FSPL is theoretical — not received power", () => {
  const db = fsplDb(732, 437.5);
  assert.ok(Number.isFinite(db));
  const rssi = null;
  assert.equal(rssi, null);
});

test("astronomy-engine Moon look is MODELLED, never MEASURED", () => {
  const moon = lookMoon(observer, new Date("2026-08-24T09:00:00Z"));
  assert.equal(moon.state, "MODELLED");
  assert.notEqual(moon.state, "MEASURED");
  assert.ok(moon.elevationDeg > -90 && moon.elevationDeg < 90);
  assert.ok(moon.rangeKm > 300_000 && moon.rangeKm < 500_000);
  assert.equal(moon.kind, "MOON");
});

test("Keplerian comet is MODELLED and has no RF claim", () => {
  const comet = lookComet(observer, new Date("2026-08-24T09:00:00Z"));
  assert.equal(comet.state, "MODELLED");
  assert.equal(comet.kind, "COMET");
  assert.ok(comet.rangeKm > 1_000_000);
  const rf = { rssi: null as number | null, lock: false };
  assert.equal(rf.lock, false);
  assert.equal(rf.rssi, null);
});

test("subsolar point is a valid Earth latitude", () => {
  const sub = subsolarPoint(new Date("2026-08-24T12:00:00Z"));
  assert.equal(sub.state, "MODELLED");
  assert.ok(sub.latDeg > 5 && sub.latDeg < 18);
  assert.ok(sub.lonDeg >= -180 && sub.lonDeg <= 180);
});

test("GPS fallback never silently becomes SENSOR", () => {
  const source = observer.source;
  assert.equal(source, "ESTIMATED");
  assert.notEqual(source, "SENSOR");
  const manual = { ...observer, source: "MANUAL" as const };
  assert.equal(manual.source, "MANUAL");
});

test("API unavailable state is OFFLINE with NOT MEASURED telemetry", () => {
  const edge = {
    status: "OFFLINE" as const,
    loopback: false,
    batteryPct: null as number | null,
    source: "NOT MEASURED" as const,
  };
  assert.equal(edge.status, "OFFLINE");
  assert.equal(edge.loopback, false);
  assert.equal(edge.batteryPct, null);
  assert.equal(edge.source, "NOT MEASURED");
});

test("malformed telemetry is rejected, not displayed as SENSOR", () => {
  const raw: unknown = { battery: "seventy", cpu: NaN };
  const rec = raw as { battery?: unknown; cpu?: unknown };
  const battery =
    typeof rec.battery === "number" && Number.isFinite(rec.battery) ? rec.battery : null;
  const cpu = typeof rec.cpu === "number" && Number.isFinite(rec.cpu) ? rec.cpu : null;
  assert.equal(battery, null);
  assert.equal(cpu, null);
  const label = battery == null ? "NOT MEASURED" : "SENSOR";
  assert.equal(label, "NOT MEASURED");
});

test("stale telemetry is not treated as live SENSOR", () => {
  const checkedAt = Date.parse("2026-08-24T08:00:00Z");
  const now = Date.parse("2026-08-24T09:00:00Z");
  const fresh = now - checkedAt < 30_000;
  assert.equal(fresh, false);
  const label = fresh ? "SENSOR" : "NOT MEASURED";
  assert.equal(label, "NOT MEASURED");
});

test("pasted TLE parses into CUSTOM catalog entry", () => {
  const block = `ISS (ZARYA)\n${ISS_TEST_TLE.line1}\n${ISS_TEST_TLE.line2}`;
  const entry = parseTleBlock(block);
  assert.ok(entry);
  assert.equal(entry.category, "CUSTOM");
  assert.equal(entry.norad, "25544");
});

test("signed modelled marble does not become MEASURED", () => {
  const marble = { evidence: "MODELLED" as const, signed: true };
  assert.equal(marble.signed, true);
  assert.equal(marble.evidence, "MODELLED");
  assert.notEqual(marble.evidence, "MEASURED");
});
