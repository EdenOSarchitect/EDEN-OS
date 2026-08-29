import { useEffect, useRef } from "react";
import { selectedTrack, useAura } from "@/lib/aura/store.ts";
import { fmtAz, fmtEl } from "@/lib/aura/format.ts";
import type { ModelledBody } from "@/lib/aura/bodies.ts";

export function SkyDial({ bodies }: { bodies: ModelledBody[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tracks = useAura((s) => s.tracks);
  const selected = useAura((s) => selectedTrack(s));
  const play = useAura((s) => s.play);
  const now = useAura((s) => s.now);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const cap = window.innerWidth < 640 ? 240 : 300;
    const size = Math.min(parent?.clientWidth ?? 320, cap);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;

    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#23282f";
    ctx.lineWidth = 1;
    for (const el of [0, 30, 60]) {
      const rr = r * ((90 - el) / 90);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#323840";
    ctx.stroke();

    ctx.strokeStyle = "#1a2026";
    for (let az = 0; az < 360; az += 30) {
      const a = ((az - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }

    ctx.fillStyle = "#5c636b";
    ctx.font = "10px IBM Plex Mono, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labels: [string, number, number][] = [
      ["N", 0, -1],
      ["E", 1, 0],
      ["S", 0, 1],
      ["W", -1, 0],
    ];
    for (const [t, dx, dy] of labels) {
      ctx.fillText(t, cx + dx * (r + 14), cy + dy * (r + 14));
    }

    const position = (az: number, el: number) => {
      if (el < 0) return null;
      const rho = r * ((90 - Math.min(el, 90)) / 90);
      const a = ((az - 90) * Math.PI) / 180;
      return { x: cx + Math.cos(a) * rho, y: cy + Math.sin(a) * rho };
    };

    const plot = (az: number, el: number, color: string, rad: number, ring = false) => {
      const p = position(az, el);
      if (!p) return null;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
      if (ring) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      return p;
    };

    for (const t of tracks) {
      if (t.id === selected?.id) continue;
      plot(t.azimuthDeg, t.elevationDeg, t.aboveHorizon ? "#4a5560" : "#2a333c", 2);
    }

    for (const b of bodies) {
      const radius = b.kind === "MOON" ? 3.5 : b.kind === "PLANET" ? 4 : 2.5;
      const p = plot(b.azimuthDeg, b.elevationDeg, "#a3926e", radius, b.kind === "PLANET");
      if (p) {
        ctx.fillStyle = "#a3926e";
        ctx.font = "8px IBM Plex Mono, ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText(b.name, p.x + 7, p.y - 7);
        ctx.textAlign = "center";
      }
    }

    if (selected) {
      const az = selected.azimuthDeg + play.azDeg;
      const el = selected.elevationDeg + play.elDeg;
      plot(az, el, "#c5cdd6", 5, true);
    }

    ctx.fillStyle = "#e6e8eb";
    ctx.font = "11px IBM Plex Mono, ui-monospace, monospace";
    ctx.fillText("ZENITH", cx, cy - 28);
    if (selected) {
      const az = selected.azimuthDeg + play.azDeg;
      const el = selected.elevationDeg + play.elDeg;
      ctx.font = "20px IBM Plex Mono, ui-monospace, monospace";
      ctx.fillText(fmtAz(az), cx, cy - 4);
      ctx.fillText(fmtEl(el), cx, cy + 20);
      ctx.fillStyle = "#b59a6a";
      ctx.font = "9px IBM Plex Mono, ui-monospace, monospace";
      ctx.fillText(play.azDeg || play.elDeg ? "PLAY OFFSET" : "MODELLED", cx, cy + 38);
    }
  }, [tracks, selected, play, now, bodies]);

  return (
    <div className="mx-auto flex max-w-[300px] justify-center border border-line bg-panel">
      <canvas ref={ref} className="max-w-full" aria-label="Azimuth elevation sky plot" />
    </div>
  );
}
