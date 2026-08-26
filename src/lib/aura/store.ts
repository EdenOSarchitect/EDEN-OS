import { create } from "zustand";
import { CURATED_CATALOG, parseTleBlock } from "./catalog.ts";
import { computePasses, propagateCatalog } from "./track.ts";
import {
  DEFAULT_CARRIER_MHZ,
  type AuraTab,
  type CameraMode,
  type CatalogEntry,
  type EdgeSnapshot,
  type LocationSource,
  type Observer,
  type PassWindow,
  type PlayOffset,
  type TrackedSatellite,
} from "./types.ts";

export interface AuraState {
  tab: AuraTab;
  cameraMode: CameraMode;
  observer: Observer;
  catalog: CatalogEntry[];
  selectedId: string;
  tracks: TrackedSatellite[];
  passes: Record<string, PassWindow | null>;
  now: number;
  carrierMhz: number;
  minElevation: number;
  webglOk: boolean;
  globe2d: boolean;
  edge: EdgeSnapshot;
  play: PlayOffset;
  huntQuery: string;
  setTab: (t: AuraTab) => void;
  setCamera: (m: CameraMode) => void;
  setObserver: (o: Partial<Observer>) => void;
  select: (id: string) => void;
  setCarrier: (mhz: number) => void;
  setPlay: (p: PlayOffset) => void;
  setHuntQuery: (q: string) => void;
  setGlobe2d: (v: boolean) => void;
  setWebglOk: (v: boolean) => void;
  addTle: (text: string) => boolean;
  tick: (now?: number) => void;
  refreshPasses: () => void;
  setEdge: (e: EdgeSnapshot) => void;
}

const defaultObserver: Observer = {
  latDeg: 51.5074,
  lonDeg: -0.1278,
  altKm: 0.05,
  source: "ESTIMATED",
};

export const useAura = create<AuraState>((set, get) => ({
  tab: "DIAL",
  cameraMode: "GLOBAL",
  observer: defaultObserver,
  catalog: CURATED_CATALOG,
  selectedId: CURATED_CATALOG[0].id,
  tracks: [],
  passes: {},
  now: 0,
  carrierMhz: DEFAULT_CARRIER_MHZ,
  minElevation: 10,
  webglOk: true,
  globe2d: false,
  edge: {
    status: "OFFLINE",
    loopback: false,
    checkedAt: null,
    batteryPct: null,
    cpuLoad: null,
    memoryPct: null,
    charging: null,
    voltage: null,
    currentMa: null,
    source: "NOT MEASURED",
  },
  play: { azDeg: 0, elDeg: 0 },
  huntQuery: "",
  setTab: (tab) => set({ tab }),
  setCamera: (cameraMode) => set({ cameraMode }),
  setObserver: (o) => {
    set({ observer: { ...get().observer, ...o } });
    get().refreshPasses();
  },
  select: (selectedId) => set({ selectedId }),
  setCarrier: (carrierMhz) => set({ carrierMhz }),
  setPlay: (play) => set({ play }),
  setHuntQuery: (huntQuery) => set({ huntQuery }),
  setGlobe2d: (globe2d) => set({ globe2d }),
  setWebglOk: (webglOk) => set({ webglOk, globe2d: webglOk ? get().globe2d : true }),
  addTle: (text) => {
    const entry = parseTleBlock(text);
    if (!entry) return false;
    set({ catalog: [entry, ...get().catalog], selectedId: entry.id });
    get().refreshPasses();
    get().tick();
    return true;
  },
  tick: (nowMs) => {
    const now = nowMs ?? Date.now();
    const { catalog, observer, carrierMhz, passes } = get();
    const tracks = propagateCatalog(catalog, observer, new Date(now), carrierMhz, passes);
    set({ now, tracks });
  },
  refreshPasses: () => {
    const { catalog, observer } = get();
    const passes = computePasses(catalog, observer, new Date());
    set({ passes });
  },
  setEdge: (edge) => set({ edge }),
}));

export function selectedTrack(s: AuraState): TrackedSatellite | undefined {
  return s.tracks.find((t) => t.id === s.selectedId) ?? s.tracks[0];
}

export function locationLabel(source: LocationSource) {
  if (source === "SENSOR") return "SENSOR";
  if (source === "MANUAL") return "MANUAL";
  return "ESTIMATED";
}
