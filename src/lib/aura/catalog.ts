import { encodeTle } from "./tle.ts";
import type { CatalogEntry } from "./types.ts";

const EPOCH = "2026-08-20T00:00:00.000";

function item(
  name: string,
  objectId: string,
  norad: number,
  opts: {
    n: number;
    e: number;
    i: number;
    raan: number;
    aop: number;
    m: number;
    bstar?: number;
    ndot?: number;
  },
): CatalogEntry {
  const tle = encodeTle({
    norad,
    intl: objectId,
    epoch: EPOCH,
    n: opts.n,
    e: opts.e,
    i: opts.i,
    raan: opts.raan,
    aop: opts.aop,
    m: opts.m,
    bstar: opts.bstar,
    ndot: opts.ndot,
  });
  return {
    id: String(norad),
    name,
    norad: String(norad),
    category: categoryFor(name),
    objectId,
    tle1: tle.line1,
    tle2: tle.line2,
  };
}

function categoryFor(name: string): CatalogEntry["category"] {
  if (name.includes("ISS") || name.includes("CSS")) return "ISS";
  if (name.includes("STARLINK")) return "STARLINK";
  if (name.includes("NOAA") || name.includes("GOES")) return "WEATHER";
  if (name.includes("GPS")) return "GNSS";
  if (name.includes("HST") || name.includes("HUBBLE")) return "SCIENCE";
  if (name.includes("LANDSAT") || name.includes("SENTINEL")) return "EARTH OBSERVATION";
  return "CUSTOM";
}

export const CURATED_CATALOG: CatalogEntry[] = [
  item("ISS (ZARYA)", "1998-067A", 25544, {
    n: 15.501, e: 0.0006, i: 51.64, raan: 74.2, aop: 48.1, m: 312.0,
  }),
  item("CSS (TIANHE)", "2021-035A", 48274, {
    n: 15.61, e: 0.0005, i: 41.47, raan: 118.4, aop: 22.0, m: 80.0,
  }),
  item("HST", "1990-037B", 20580, {
    n: 15.09, e: 0.0003, i: 28.47, raan: 210.0, aop: 90.0, m: 40.0,
  }),
  item("NOAA 20", "2017-073A", 43013, {
    n: 14.195, e: 0.00012, i: 98.74, raan: 16.5, aop: 70.0, m: 290.0,
  }),
  item("GOES 16", "2016-071A", 41866, {
    n: 1.0027, e: 0.0002, i: 0.04, raan: 250.0, aop: 200.0, m: 160.0, bstar: 0, ndot: 0,
  }),
  item("GPS BIIR-2  (PRN 13)", "1997-035A", 24876, {
    n: 2.0056, e: 0.008, i: 55.1, raan: 55.0, aop: 180.0, m: 20.0, bstar: 0, ndot: 0,
  }),
  item("LANDSAT 8", "2013-008A", 39084, {
    n: 14.57, e: 0.00013, i: 98.2, raan: 330.0, aop: 85.0, m: 275.0,
  }),
  item("STARLINK-1007", "2019-029A", 44235, {
    n: 15.064, e: 0.00014, i: 53.05, raan: 12.0, aop: 90.0, m: 10.0,
  }),
  item("STARLINK-1130", "2020-001K", 44742, {
    n: 15.064, e: 0.00012, i: 53.05, raan: 92.0, aop: 88.0, m: 140.0,
  }),
  item("STARLINK-30221", "2024-001A", 58200, {
    n: 15.06, e: 0.0001, i: 53.0, raan: 188.0, aop: 70.0, m: 250.0,
  }),
  item("STARLINK-G6-1", "2023-050A", 56120, {
    n: 15.065, e: 0.00011, i: 43.0, raan: 260.0, aop: 40.0, m: 200.0,
  }),
];

export const ISS_TEST_TLE = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992",
  line2: "2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442",
};

export function parseTleBlock(text: string): CatalogEntry | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  let name = "CUSTOM";
  let l1 = "";
  let l2 = "";
  if (lines.length >= 3 && !lines[0].startsWith("1 ")) {
    name = lines[0].slice(0, 24);
    l1 = lines[1];
    l2 = lines[2];
  } else {
    l1 = lines[0];
    l2 = lines[1];
  }
  if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) return null;
  const norad = l1.slice(2, 7).trim();
  return {
    id: `custom-${norad}-${Date.now()}`,
    name,
    norad,
    category: "CUSTOM",
    objectId: norad,
    tle1: l1,
    tle2: l2,
  };
}
