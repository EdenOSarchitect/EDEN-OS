export type AuraTab = "DIAL" | "HUNT" | "AURA" | "EDGE" | "MORE";
export type CameraMode = "GLOBAL" | "OBSERVER" | "TRACK" | "PASS";
export type CatalogCategory =
  | "STARLINK"
  | "ISS"
  | "WEATHER"
  | "EARTH OBSERVATION"
  | "GNSS"
  | "SCIENCE"
  | "AMATEUR"
  | "CUSTOM";

export type AuraEvidence =
  | "SENSOR"
  | "MEASURED"
  | "MODELLED"
  | "PREDICTED"
  | "ESTIMATED"
  | "PLAY"
  | "NOT MEASURED"
  | "MANUAL";

export type LocationSource = "SENSOR" | "MANUAL" | "ESTIMATED";

export interface Observer {
  latDeg: number;
  lonDeg: number;
  altKm: number;
  source: LocationSource;
}

export interface PassWindow {
  rise: Date;
  culmination: Date;
  set: Date;
  maxElevationDeg: number;
  durationSec: number;
  riseAzDeg: number;
  setAzDeg: number;
  state: "PREDICTED";
}

export interface TrackedSatellite {
  id: string;
  name: string;
  norad: string;
  category: CatalogCategory;
  latDeg: number;
  lonDeg: number;
  altitudeKm: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  rangeRateKmS: number;
  velocityKmS: number;
  dopplerHz: number;
  fsplDb: number;
  carrierMhz: number;
  approaching: boolean;
  aboveHorizon: boolean;
  geometricLock: boolean;
  geometryScore: number;
  state: "MODELLED";
  pass: PassWindow | null;
  epoch: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  norad: string;
  category: CatalogCategory;
  objectId: string;
  omm?: Record<string, string | number>;
  tle1?: string;
  tle2?: string;
}

export interface RFSource {
  id: string;
  type: "SDR" | "MODEM" | "RADIO";
  connected: boolean;
  getRSSI(): Promise<number | null>;
}

export interface EdgeSnapshot {
  status: "ONLINE" | "OFFLINE";
  loopback: boolean;
  checkedAt: string | null;
  batteryPct: number | null;
  cpuLoad: number | null;
  memoryPct: number | null;
  charging: boolean | null;
  voltage: number | null;
  currentMa: number | null;
  source: AuraEvidence;
}

export interface EvidenceRow {
  id: string;
  label: string;
  value: string;
  source: string;
  state: AuraEvidence;
  timestamp: string;
}

export interface PlayOffset {
  azDeg: number;
  elDeg: number;
}

export const C_KM_S = 299_792.458;
export const EARTH_RADIUS_KM = 6371;
export const DEFAULT_CARRIER_MHZ = 437.5;
export const MIN_LOCK_ELEVATION_DEG = 10;
export const MAX_LOCK_RANGE_KM = 2500;
