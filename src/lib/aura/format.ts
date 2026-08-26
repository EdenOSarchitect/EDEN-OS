export function fmtDeg(n: number, digits = 1) {
  return `${n.toFixed(digits)}°`;
}

export function fmtAz(n: number) {
  return `${(((n % 360) + 360) % 360).toFixed(1)}°`;
}

export function fmtEl(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}°`;
}

export function fmtKm(n: number, digits = 0) {
  if (Math.abs(n) >= 1000) return `${(n / 1).toFixed(digits)} km`;
  return `${n.toFixed(Math.max(digits, 1))} km`;
}

export function fmtRate(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} km/s`;
}

export function fmtHz(n: number) {
  const sign = n >= 0 ? "+" : "";
  if (Math.abs(n) >= 1000) return `${sign}${(n / 1000).toFixed(2)} kHz`;
  return `${sign}${n.toFixed(1)} Hz`;
}

export function fmtDb(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)} dB`;
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function fmtUtc(d: Date) {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
}

export function fmtCountdown(ms: number) {
  const sign = ms < 0 ? "T+" : "T−";
  const abs = Math.abs(ms) / 1000;
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  if (h > 0) return `${sign}${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${sign}${pad2(m)}:${pad2(s)}`;
}

export function fmtScore(n: number) {
  return n.toFixed(3);
}
