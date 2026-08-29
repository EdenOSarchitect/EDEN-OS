import { useEffect, useRef } from "react";
import { selectedTrack, useAura } from "@/lib/aura/store.ts";
import { latLonAltToXYZ } from "@/lib/aura/track.ts";

export function Globe2D() {
  const ref = useRef<HTMLCanvasElement>(null);
  const tracks = useAura((s) => s.tracks);
  const observer = useAura((s) => s.observer);
  const selected = useAura((s) => selectedTrack(s));
  const now = useAura((s) => s.now);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? 360;
    const h = parent?.clientHeight ?? 280;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#08090b";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;

    ctx.strokeStyle = "#23282f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#1a2026";
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 6) {
        const p = project(lat, lon, r);
        if (p.z < 0) continue;
        lon === -180 ? ctx.moveTo(cx + p.x, cy - p.y) : ctx.lineTo(cx + p.x, cy - p.y);
      }
      ctx.stroke();
    }

    const obs = project(observer.latDeg, observer.lonDeg, r);
    if (obs.z >= 0) {
      ctx.fillStyle = "#b59a6a";
      ctx.fillRect(cx + obs.x - 3, cy - obs.y - 3, 6, 6);
    }

    for (const t of tracks) {
      const p = project(t.latDeg, t.lonDeg, r * (1 + t.altitudeKm / 6371));
      if (p.z < 0) continue;
      ctx.fillStyle = t.id === selected?.id ? "#c5cdd6" : t.aboveHorizon ? "#7d9a84" : "#5c636b";
      const s = t.id === selected?.id ? 4 : 2.5;
      ctx.fillRect(cx + p.x - s / 2, cy - p.y - s / 2, s, s);
    }

    if (selected) {
      const a = project(observer.latDeg, observer.lonDeg, r);
      const b = project(selected.latDeg, selected.lonDeg, r * (1 + selected.altitudeKm / 6371));
      if (a.z >= 0 && b.z >= 0) {
        ctx.strokeStyle = "#7e93a8";
        ctx.beginPath();
        ctx.moveTo(cx + a.x, cy - a.y);
        ctx.lineTo(cx + b.x, cy - b.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#5c636b";
    ctx.font = "10px IBM Plex Mono, ui-monospace, monospace";
    ctx.fillText("GLOBE 2D · FALLBACK", 12, 18);
  }, [tracks, observer, selected, now]);

  return <canvas ref={ref} className="h-full w-full" />;
}

function project(lat: number, lon: number, r: number) {
  const v = latLonAltToXYZ(lat, lon, 0, r);
  return v;
}
