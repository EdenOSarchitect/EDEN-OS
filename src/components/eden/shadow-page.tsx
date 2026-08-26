import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EvidenceLabel, EvidenceStack } from "./evidence-label";
import {
  WORKLOADS,
  advanceBlocks,
  bytesKept,
  bytesVoided,
  classCounts,
  formatBytes,
  formatNumber,
  seedWorkload,
} from "@/lib/eden";
import { aokDecide } from "@/lib/aok";
import { AOK_CAPABILITIES } from "@/lib/aok";
import { cn } from "@/lib/utils";

export function ShadowPage() {
  const [presetId, setPresetId] = useState(WORKLOADS[0].id);
  const preset = WORKLOADS.find((w) => w.id === presetId) ?? WORKLOADS[0];

  const result = useMemo(() => {
    let blocks = seedWorkload(preset);
    for (let i = 1; i <= 6; i++) blocks = advanceBlocks(blocks, i, preset);
    const counts = classCounts(blocks);
    const kept = bytesKept(blocks);
    const voided = bytesVoided(blocks);
    const ratio = preset.bytesIn > 0 ? kept / preset.bytesIn : 0;
    return { blocks, counts, kept, voided, ratio };
  }, [preset]);

  const aok = aokDecide(
    AOK_CAPABILITIES.find((c) => c.id === "refinery-demo") ?? AOK_CAPABILITIES[0],
    "EXECUTE_PRODUCTION",
  );
  const observe = aokDecide(
    AOK_CAPABILITIES.find((c) => c.id === "refinery-demo") ?? AOK_CAPABILITIES[0],
    "OBSERVE",
  );

  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">EDEN Shadow · read-only observation</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
            Prove the economics before changing production.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Production keeps running. EDEN observes, classifies and calculates an alternative
            path. Execution control is a later decision — and AOK will HOLD it until a measured
            validation exists.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <EvidenceLabel label="DEMONSTRATION" />
            <EvidenceLabel label="COUNTERFACTUAL" />
            <EvidenceLabel label="MODELLED" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label-kicker">Split observation</p>
              <h2 className="mt-1 text-xl font-medium text-fg">
                Current path unchanged. EDEN path calculated beside it.
              </h2>
            </div>
            <label className="block">
              <span className="sr-only">Workload</span>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
                className="h-11 min-w-[12rem] border border-line-strong bg-surface px-3 font-mono text-xs text-fg"
              >
                {WORKLOADS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
            <article className="bg-surface p-5">
              <p className="font-mono text-[11px] tracking-[0.16em] text-faint">BASELINE · UNCHANGED</p>
              <p className="mt-6 font-mono text-3xl tabular-nums text-fg">
                {formatBytes(preset.bytesIn)}
              </p>
              <p className="mt-2 text-sm text-muted">
                Envelope as currently scheduled. Deadline {preset.deadlineMs} ms · compute{" "}
                {preset.computeMs} ms · bandwidth {preset.bandwidthMb} MB.
              </p>
              <p className="mt-4 font-mono text-[11px] text-faint">
                Production traffic is not intercepted in shadow mode.
              </p>
            </article>
            <article className="bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[11px] tracking-[0.16em] text-faint">
                  EDEN SHADOW · COUNTERFACTUAL
                </p>
                <EvidenceStack labels={["MODELLED", "DEMONSTRATION"]} />
              </div>
              <p className="mt-6 font-mono text-3xl tabular-nums text-fg">
                {formatBytes(result.kept)}
              </p>
              <p className="mt-2 text-sm text-muted">
                Retained payload after KEEP / STRUCTURE / DETAIL. Voided {formatBytes(result.voided)}{" "}
                ({formatNumber(result.ratio * 100, 1)}% kept of envelope).
              </p>
              <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] text-muted">
                {(["KEEP", "STRUCTURE", "DETAIL", "RESIDUAL", "VOID"] as const).map((k) => (
                  <span key={k}>
                    {k} {result.counts[k]}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-3 grid gap-px border border-line bg-line sm:grid-cols-2">
            <Gate
              title="AOK · OBSERVE"
              verdict={observe.verdict}
              body={observe.note}
            />
            <Gate
              title="AOK · EXECUTE PRODUCTION"
              verdict={aok.verdict}
              body={aok.note}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <p className="label-kicker">Why shadow first</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          Control is earned, not assumed.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Enterprise buyers should be able to put EDEN beside an AI stack, let it observe cost and
          execution, and see whether there is a real optimisation opportunity before giving it
          control. No active customer deployment is claimed on this site.
        </p>
        <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
          {[
            ["01 BASELINE", "What the current path actually costs and produces."],
            ["02 COUNTERFACTUAL", "What a refined path is modelled to cost and produce."],
            ["03 DELTA", "The difference, classed as MODELLED until production validates it."],
          ].map(([t, b]) => (
            <li key={t} className="bg-surface p-5">
              <p className="font-mono text-[11px] tracking-[0.14em] text-fg">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{b}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/aok">OPEN AOK</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/refinery">RUN THE REFINERY</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/pilot">DISCUSS A PILOT</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}

function Gate({
  title,
  verdict,
  body,
}: {
  title: string;
  verdict: string;
  body: string;
}) {
  return (
    <div className="bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint">{title}</p>
        <span
          className={cn(
            "font-mono text-[11px] tracking-[0.14em]",
            verdict === "CLEARED" && "text-keep",
            verdict === "HOLD" && "text-modelled",
            verdict === "DENIED" && "text-danger",
          )}
        >
          {verdict === "CLEARED" ? "A-OK" : verdict}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
