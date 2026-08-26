import { useMemo, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EvidenceStack } from "./evidence-label";
import {
  DEFAULT_NEURAL_SIGNALS,
  NEURAL_STAGES,
  neuralScore,
  runNeuralField,
  type NeuralSignal,
} from "@/lib/neural-field";

export function NeuralFieldPage() {
  const [signals, setSignals] = useState<NeuralSignal[]>(DEFAULT_NEURAL_SIGNALS);
  const [runNonce, setRunNonce] = useState(0);
  const run = useMemo(() => runNeuralField(signals), [signals, runNonce]);

  function rerun() {
    setRunNonce((n) => n + 1);
  }

  function reset() {
    setSignals(DEFAULT_NEURAL_SIGNALS);
    setRunNonce((n) => n + 1);
  }

  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">Neural Field</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.2rem] font-medium leading-[1.1] tracking-[-0.03em] text-fg sm:text-5xl">
            Coordinate signals before they become actions.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
            Neural Field is the coordination layer between EDEN surfaces. It binds provenance,
            confidence, utility, urgency and cost to incoming signals, then routes only the signals
            that clear the active policy threshold.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <EvidenceStack labels={["IMPLEMENTED", "MODELLED", "DEMONSTRATION"]} />
          </div>
          <p className="mt-4 max-w-3xl font-mono text-[11px] leading-relaxed text-faint">
            This page is a deterministic client-side demonstration. It is not yet a measured neural
            network, production message bus, or autonomous control system.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label-kicker">Pipeline</p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-fg">
                INGEST → BIND → SCORE → ROUTE → REFINE → VERIFY
              </h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={rerun}>
                <Play className="size-3.5" /> RUN FIELD
              </Button>
              <Button variant="secondary" onClick={reset}>
                <RotateCcw className="size-3.5" /> RESET
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
            {run.stages.map((stage, index) => (
              <div key={stage.id} className="bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.16em] text-faint">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 font-mono text-xs tracking-[0.14em] text-fg">{stage.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{stage.note}</p>
                <div className="mt-4">
                  <EvidenceStack labels={stage.evidence} />
                </div>
                <p className="mt-4 font-mono text-[10px] text-faint">
                  {stage.inputCount} IN · {stage.outputCount} OUT
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="label-kicker">Signal field</p>
            <div className="mt-4 grid gap-2">
              {signals.map((signal) => {
                const score = neuralScore(signal);
                const accepted = score >= 0.55;
                return (
                  <div key={signal.id} className="border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] tracking-[0.16em] text-fg">
                          {signal.source}
                        </p>
                        <p className="mt-1 text-sm text-muted">{signal.payload}</p>
                      </div>
                      <span className={accepted ? "font-mono text-xs text-keep" : "font-mono text-xs text-danger"}>
                        {accepted ? "ROUTE" : "HOLD"} · {score.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Metric label="UTILITY" value={signal.utility} />
                      <Metric label="CONFIDENCE" value={signal.confidence} />
                      <Metric label="URGENCY" value={signal.urgency} />
                      <Metric label="COST" value={signal.cost} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="border border-line bg-panel p-5">
            <p className="label-kicker">Run transcript</p>
            <dl className="mt-5 space-y-4">
              <Row label="Run ID" value={run.runId} />
              <Row label="Policy" value={run.policy} />
              <Row label="Field score" value={run.score.toFixed(3)} />
              <Row label="Signals routed" value={String(run.accepted.length)} />
              <Row label="Signals held" value={String(run.held.length)} />
              <Row label="Timestamp" value={run.startedAt} />
            </dl>
            <div className="mt-6 border-t border-line pt-5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-faint">NEXT COUPLING</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Route accepted signals into Refinery, gate actions through AOK, then bind the final
                transcript to a Marble. That production coupling remains the next implementation step.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line bg-panel px-3 py-2">
      <p className="font-mono text-[9px] tracking-[0.14em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-fg">{value.toFixed(2)}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-fg">{value}</dd>
    </div>
  );
}
