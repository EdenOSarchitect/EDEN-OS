import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { ProofCards } from "./proof-cards";
import { Markets, PlatformModules } from "./platform-modules";
import { EvidenceStack } from "./evidence-label";

const PRODUCTS = [
  {
    to: "/refinery",
    kicker: "01",
    name: "REFINERY",
    title: "Turn workload into verified useful value.",
    body: "Decompose, measure, classify KEEP / STRUCTURE / DETAIL / RESIDUAL / VOID, then mint a Marble.",
  },
  {
    to: "/aura",
    kicker: "02",
    name: "AURA FIELD",
    title: "See what is above you — and what computation it is worth.",
    body: "Live SGP4 geometry, predicted passes, modelled Doppler and FSPL. RF remains NOT MEASURED until a receiver exists.",
  },
  {
    to: "/aok",
    kicker: "03",
    name: "AOK",
    title: "Refuse to run on an unsupported claim.",
    body: "The attested operational kernel. Evidence class is bound to admissible action before observe, model, execute or public claim.",
  },
  {
    to: "/shadow",
    kicker: "04",
    name: "SHADOW",
    title: "Prove the economics before changing production.",
    body: "Read-only observation. Baseline, counterfactual and delta — labelled until a pilot measures them.",
  },
];

const FLOW = ["SENSE", "DECOMPOSE", "MEASURE", "KEEP / VOID", "REGENERATE", "NAVIGATE", "VERIFY"];

export function HomePage() {
  return (
    <SiteShell>
      <section className="hero-aurora relative overflow-hidden border-b border-line">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />

        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 border border-line-strong bg-bg/55 px-3 py-2 backdrop-blur">
              <span className="status-pulse" />
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted">EDEN OS · VALUE-AWARE CONTROL LAYER</p>
            </div>

            <h1 className="mt-6 max-w-[13ch] text-[3rem] font-medium leading-[0.98] tracking-[-0.055em] text-fg sm:text-6xl lg:text-[5.1rem]">
              Use less.
              <span className="block text-gradient">Prove more.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              EDEN decides what work matters, what can be reused or removed, when the rest should run,
              and how every decision can be independently verified.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/refinery">RUN THE REFINERY</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/evidence">VIEW EVIDENCE</Link>
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-px border border-line bg-line">
              <div className="metric-cell">
                <span className="metric-value">KEEP</span>
                <span className="metric-label">useful work</span>
              </div>
              <div className="metric-cell">
                <span className="metric-value">VOID</span>
                <span className="metric-label">avoidable work</span>
              </div>
              <div className="metric-cell">
                <span className="metric-value">VERIFY</span>
                <span className="metric-label">evidence bound</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="instrument-panel overflow-hidden border border-line-strong bg-panel/90 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="status-pulse" />
                  <span className="font-mono text-[10px] tracking-[0.16em] text-fg">REFINERY / LIVE ARCHITECTURE</span>
                </div>
                <span className="font-mono text-[10px] tracking-[0.14em] text-faint">EVIDENCE FIRST</span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="refinery-visual">
                  <div className="refinery-core">
                    <div className="refinery-core-ring refinery-core-ring-1" />
                    <div className="refinery-core-ring refinery-core-ring-2" />
                    <div className="refinery-core-dot" />
                    <span>EDEN</span>
                  </div>
                  <div className="refinery-trace trace-a" />
                  <div className="refinery-trace trace-b" />
                  <div className="refinery-trace trace-c" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["RAW", "KEEP", "STRUCTURE", "VOID"].map((label, index) => (
                    <div key={label} className="border border-line bg-bg/70 px-3 py-3">
                      <div className="mb-3 h-1 overflow-hidden bg-line">
                        <div className={`signal-bar signal-bar-${index + 1}`} />
                      </div>
                      <p className="font-mono text-[10px] tracking-[0.15em] text-fg">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border border-line bg-bg/50 p-3 font-mono text-[10px] leading-6 tracking-[0.08em] text-muted">
                  <span className="text-measured">● MEASURED</span> stays measured. <span className="text-modelled">● MODELLED</span> stays modelled. Unsupported claims do not silently become facts.
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-2 hidden border border-line bg-bg/95 px-4 py-3 font-mono text-[10px] tracking-[0.12em] text-muted shadow-xl sm:block">
              MARBLE → CRYPTOGRAPHIC EVIDENCE CONTAINER
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-bg/80">
        <div className="mx-auto max-w-[1400px] overflow-x-auto px-4 py-4 sm:px-6">
          <div className="flex min-w-max items-center gap-3">
            {FLOW.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.15em] text-muted">{step}</span>
                {index < FLOW.length - 1 ? <span className="text-faint">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="label-kicker">Core systems</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              One architecture. Multiple control surfaces.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            From computation and evidence to orbital context and economic shadowing, each surface exposes a different part of the same control loop.
          </p>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link key={p.to} to={p.to} className="product-card group relative overflow-hidden border border-line bg-surface p-5 sm:p-6">
              <div className="product-card-glow" />
              <div className="relative">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-faint">{p.kicker}</p>
                  <p className="font-mono text-[11px] tracking-[0.16em] text-fg">{p.name}</p>
                </div>
                <h3 className="mt-8 max-w-md text-xl font-medium tracking-tight text-fg">{p.title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{p.body}</p>
                <div className="mt-7 flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">OPEN SYSTEM</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel/90">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="label-kicker">Evidence discipline</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-fg sm:text-4xl">
                Don’t trust the claim. Verify the evidence.
              </h2>
            </div>
            <EvidenceStack labels={["IMPLEMENTED", "MEASURED", "REPRODUCIBLE", "MODELLED", "PROPOSED"]} />
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
            EDEN keeps simulation, local demonstration, physical measurement and proposal separate. AOK binds evidence class to admissible action before a capability executes or speaks publicly.
          </p>
        </div>
      </section>

      <ProofCards />
      <PlatformModules />
      <Markets />

      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="cta-panel relative overflow-hidden border border-line-strong px-6 py-10 sm:px-10 sm:py-14">
          <div className="product-card-glow" />
          <div className="relative max-w-3xl">
            <p className="label-kicker">Pilot</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-5xl">
              Prove the economics before changing production.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
              Start in shadow mode. Observe, classify and compare alternative strategies before production execution is permitted.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/shadow">ENTER SHADOW MODE</Link></Button>
              <Button asChild variant="secondary" size="lg"><Link to="/pilot">DISCUSS A PILOT</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
