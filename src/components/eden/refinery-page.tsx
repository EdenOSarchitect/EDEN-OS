import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { ProofCards } from "./proof-cards";
import { RefineryPipeline } from "./pipeline";
import { EconomicsPanel } from "./economics-panel";
import { EvidencePanel } from "./evidence-panel";
import { Markets, PilotCta, PlatformModules } from "./platform-modules";
import type { ViewMode } from "@/lib/eden";

export function RefineryPage() {
  const [mode, setMode] = useState<ViewMode>("live");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "evidence") setMode("evidence");
    if (hash === "economics") setMode("economics");
    if (hash === "live") setMode("live");
  }, []);

  function onMode(next: ViewMode) {
    setMode(next);
    const id = next === "live" ? "live" : next;
    window.history.replaceState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <SiteShell mode={mode} onMode={onMode}>
      <Hero />
      <ProblemThesis />
      {mode === "live" ? <RefineryPipeline /> : null}
      {mode === "evidence" ? <EvidencePanel /> : null}
      {mode === "economics" ? <EconomicsPanel /> : null}
      {mode !== "live" ? (
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          <p className="font-mono text-[11px] text-faint">
            Pipeline remains available under LIVE SYSTEM. This view isolates{" "}
            {mode === "evidence" ? "methodology" : "counterfactual economics"}.
          </p>
        </div>
      ) : null}
      <ProofCards />
      {mode === "live" ? <EvidencePanel /> : null}
      {mode === "live" ? <EconomicsPanel /> : null}
      <PlatformModules />
      <Markets />
      <PilotCta />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
        <p className="label-kicker">EDEN Refinery</p>
        <h1 className="mt-4 max-w-[18ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl lg:text-[3.5rem]">
          EDEN is a value-aware control layer for computation.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Turn raw compute, data and bandwidth into verified useful value.
        </p>
        <p className="mt-6 max-w-full overflow-x-auto font-mono text-[10px] tracking-[0.08em] text-faint sm:text-[11px] sm:tracking-[0.14em]">
          SENSE → DECOMPOSE → MEASURE → KEEP / VOID → REGENERATE → NAVIGATE → VSURF → TRANSMIT →
          RECOMPOSE → VERIFY
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#live">RUN THE REFINERY</a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/evidence">VIEW THE EVIDENCE</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/pilot">DISCUSS A PILOT</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProblemThesis() {
  return (
    <section className="mx-auto grid max-w-[1400px] gap-px border-b border-line lg:grid-cols-2">
      <div className="px-4 py-12 sm:px-6">
        <p className="label-kicker">Problem</p>
        <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          Traditional infrastructure asks: can this workload run?
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Every unnecessary token, inference, memory movement, network transfer, recomputation or
          low-value operation has a cost in compute, energy, bandwidth and time. Most systems
          measure how much they performed. They do not measure how much of it was useful.
        </p>
      </div>
      <div className="border-t border-line px-4 py-12 sm:px-6 lg:border-l lg:border-t-0">
        <p className="label-kicker">Thesis</p>
        <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          EDEN asks: what portion creates the most value per unit of resource?
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          EDEN is a value-aware control layer for computation. It determines what work matters, what
          can be reused or removed, when remaining work should execute, where resources should be
          allocated, and how the resulting decisions can be independently verified.
        </p>
      </div>
    </section>
  );
}
