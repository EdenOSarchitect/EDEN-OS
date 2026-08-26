import { useMemo, useState } from "react";
import { CHRONONAV_RATIO, formatNumber } from "@/lib/eden";
import { EvidenceLabel } from "./evidence-label";

const PRESETS = [
  { id: "high", label: "High-reuse synthetic (79.9%)", reuse: 0.799 },
  { id: "mixed", label: "Mixed batch (modelled 40%)", reuse: 0.4 },
  { id: "cold", label: "Cold unique (modelled 8%)", reuse: 0.08 },
];

export function EconomicsPanel() {
  const [workloadUsd, setWorkloadUsd] = useState(12000);
  const [computeUsd, setComputeUsd] = useState(8200);
  const [bandwidthUsd, setBandwidthUsd] = useState(1400);
  const [tokenK, setTokenK] = useState(8_000);
  const [tokenUsdPerK, setTokenUsdPerK] = useState(0.4);
  const [reuse, setReuse] = useState(0.4);
  const [applyChrono, setApplyChrono] = useState(true);

  const result = useMemo(() => {
    const tokenCost = tokenK * tokenUsdPerK;
    const baseline = workloadUsd + computeUsd + bandwidthUsd + tokenCost;
    const reuseSave = (computeUsd + tokenCost) * reuse * 0.72;
    const voidSave = (computeUsd + bandwidthUsd) * Math.min(0.18, reuse * 0.22 + 0.05);
    const scheduleFactor = applyChrono ? 1 - (1 - 1 / CHRONONAV_RATIO) * 0.35 : 0;
    const scheduleSave = computeUsd * scheduleFactor;
    const refined = Math.max(baseline * 0.12, baseline - reuseSave - voidSave - scheduleSave);
    return { tokenCost, baseline, reuseSave, voidSave, scheduleSave, refined, delta: baseline - refined };
  }, [workloadUsd, computeUsd, bandwidthUsd, tokenK, tokenUsdPerK, reuse, applyChrono]);

  return (
    <section id="economics" className="border-y border-line bg-panel">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-kicker">Economics</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              A labelled counterfactual, not an asserted saving.
            </h2>
          </div>
          <div className="flex gap-1">
            <EvidenceLabel label="COUNTERFACTUAL" />
            <EvidenceLabel label="ESTIMATE" />
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Enter a workload cost envelope. EDEN applies the published synthetic reuse rate and the
          ChronoNav simulated utility ratio only as scenario factors. Nothing below is a measured
          production saving on your fleet.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Field
              label="Workload cost (USD)"
              value={workloadUsd}
              min={500}
              max={200000}
              step={100}
              onChange={setWorkloadUsd}
              format={(n) => `$${formatNumber(n)}`}
            />
            <Field
              label="Compute consumption (USD)"
              value={computeUsd}
              min={100}
              max={150000}
              step={100}
              onChange={setComputeUsd}
              format={(n) => `$${formatNumber(n)}`}
            />
            <Field
              label="Bandwidth (USD)"
              value={bandwidthUsd}
              min={0}
              max={40000}
              step={50}
              onChange={setBandwidthUsd}
              format={(n) => `$${formatNumber(n)}`}
            />
            <Field
              label="Token volume (thousands)"
              value={tokenK}
              min={0}
              max={200000}
              step={100}
              onChange={setTokenK}
              format={(n) => `${formatNumber(n)} k`}
            />
            <Field
              label="Token cost (USD / 1k)"
              value={tokenUsdPerK}
              min={0}
              max={8}
              step={0.05}
              onChange={setTokenUsdPerK}
              format={(n) => `$${n.toFixed(2)}`}
            />
            <Field
              label="Reuse assumption"
              value={reuse}
              min={0}
              max={0.9}
              step={0.01}
              onChange={setReuse}
              format={(n) => `${(n * 100).toFixed(1)}%`}
            />
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setReuse(p.reuse)}
                  className="h-9 border border-line px-3 font-mono text-[10px] tracking-[0.12em] text-muted hover:border-accent hover:text-fg"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-3 font-mono text-xs text-muted">
              <input
                type="checkbox"
                checked={applyChrono}
                onChange={(e) => setApplyChrono(e.target.checked)}
                className="size-4 accent-accent"
              />
              Apply ChronoNav simulated ratio (1.40 vs EDF) as a partial scheduling factor
            </label>
          </form>

          <div className="border border-line bg-surface">
            <Row k="Baseline envelope" v={`$${formatNumber(result.baseline, 0)}`} />
            <Row k="Token cost (derived)" v={`$${formatNumber(result.tokenCost, 0)}`} />
            <Row
              k="Reuse reduction"
              v={`−$${formatNumber(result.reuseSave, 0)}`}
              hint="COUNTERFACTUAL"
            />
            <Row
              k="VOID / payload reduction"
              v={`−$${formatNumber(result.voidSave, 0)}`}
              hint="ESTIMATE"
            />
            <Row
              k="ChronoNav schedule factor"
              v={`−$${formatNumber(result.scheduleSave, 0)}`}
              hint="SIMULATED"
            />
            <Row k="EDEN scenario cost" v={`$${formatNumber(result.refined, 0)}`} strong />
            <Row
              k="Delta vs baseline"
              v={`$${formatNumber(result.delta, 0)}  (${((result.delta / result.baseline) * 100).toFixed(1)}%)`}
              strong
            />
            <p className="border-t border-line px-4 py-4 font-mono text-[11px] leading-relaxed text-faint">
              Counterfactual / estimate. The 79.9% reuse figure is a synthetic reference. The 1.40
              utility ratio is from 10,000 simulated ChronoNav trials versus EDF. Do not treat this
              panel as a quote, SLA or measured ROI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full accent-accent"
      />
    </label>
  );
}

function Row({
  k,
  v,
  hint,
  strong,
}: {
  k: string;
  v: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3">
      <div>
        <p className="text-sm text-muted">{k}</p>
        {hint ? (
          <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-modelled">{hint}</p>
        ) : null}
      </div>
      <p className={strong ? "font-mono text-base tabular-nums text-fg" : "font-mono text-sm tabular-nums text-fg"}>
        {v}
      </p>
    </div>
  );
}
