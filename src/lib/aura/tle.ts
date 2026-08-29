/** Build a NORAD two-line element with a valid checksum. */

function checksum(line68: string): number {
  let sum = 0;
  for (const ch of line68) {
    if (ch === "-") sum += 1;
    else if (ch >= "0" && ch <= "9") sum += Number(ch);
  }
  return sum % 10;
}

function dayOfYear(iso: string): number {
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return (d.getTime() - start) / 86400000;
}

function sci8(val: number): string {
  if (val === 0) return " 00000-0";
  const sign = val < 0 ? "-" : " ";
  let exp = 0;
  let m = Math.abs(val);
  while (m >= 1) {
    m /= 10;
    exp += 1;
  }
  while (m < 0.1 && m !== 0) {
    m *= 10;
    exp -= 1;
  }
  const digits = Math.round(m * 1e5)
    .toString()
    .padStart(5, "0")
    .slice(0, 5);
  const expSign = exp < 0 ? "-" : "+";
  return `${sign}${digits}${expSign}${Math.abs(exp)}`;
}

function n6(n: number, width: number, frac: number): string {
  return n.toFixed(frac).padStart(width, " ");
}

export interface TleInput {
  norad: number;
  intl: string;
  epoch: string;
  n: number;
  e: number;
  i: number;
  raan: number;
  aop: number;
  m: number;
  bstar?: number;
  ndot?: number;
  classification?: string;
}

export function encodeTle(input: TleInput): { line1: string; line2: string } {
  const norad = String(input.norad).padStart(5, "0").slice(0, 5);
  const cls = input.classification ?? "U";
  const intl = input.intl.replace("-", "").padEnd(8, " ").slice(0, 8);
  const year = new Date(input.epoch + "Z").getUTCFullYear() % 100;
  const doy = dayOfYear(input.epoch);
  const epoch = `${String(year).padStart(2, "0")}${doy.toFixed(8).padStart(12, "0")}`;
  const ndot = (input.ndot ?? 0.00002).toFixed(8).padStart(10, " ");
  const nddot = " 00000-0";
  const bstar = sci8(input.bstar ?? 0.0001);
  const elset = " 999";
  const l1body = `1 ${norad}${cls} ${intl} ${epoch} ${ndot} ${nddot} ${bstar} 0${elset}`;
  const line1 = l1body.slice(0, 68).padEnd(68, " ") + String(checksum(l1body.slice(0, 68)));

  const e7 = Math.round(input.e * 1e7)
    .toString()
    .padStart(7, "0")
    .slice(0, 7);
  const l2body =
    `2 ${norad} ${n6(input.i, 8, 4)} ${n6(input.raan, 8, 4)} ${e7} ` +
    `${n6(input.aop, 8, 4)} ${n6(input.m, 8, 4)} ${n6(input.n, 11, 8)}` +
    `  000`;
  const line2 = l2body.slice(0, 68).padEnd(68, " ") + String(checksum(l2body.slice(0, 68)));
  return { line1, line2 };
}
