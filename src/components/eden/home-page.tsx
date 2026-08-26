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
    title: "Turn a workload into verified useful value.",
    body: "Decompose, measure, classify KEEP / STRUCTURE / DETAIL / RESIDUAL / VOID, then mint a Marble.",
  },
  {
    to: "/aura",
    kicker: "02",
    name: "AURA FIELD",
    title: "What is above you, and what computation it is worth.",
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

export function HomePage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-24">
          <p className="label-kicker">EDEN OS · value-aware control layer</p>
          <h1 className="mt-4 max-w-[16ch] text-[2.4rem] font-medium leading-[1.08] tracking-[-0.035em] text-fg sm:text-6xl lg:text-[4.25rem]">
            Use less.
            <span className="block">Prove more.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            EDEN is a value-aware control layer for computation. It determines what work matters,
            what can be reused or removed, when remaining work should execute, where resources
            should be allocated, and how the resulting decisions can be independently verified.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            Traditional infrastructure asks: can this workload run? EDEN asks: what portion creates
            the most value per unit of compute, energy, bandwidth and time?
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/refinery">RUN THE REFINERY</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/aura">OPEN AURA FIELD</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/evidence">VIEW THE EVIDENCE</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <p className="label-kicker">Projects</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          One control architecture. Four demonstration surfaces.
        </h2>
        <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group bg-surface p-5 transition-colors duration-150 hover:bg-elevated sm:p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] tracking-[0.18em] text-faint">{p.kicker}</p>
                <p className="font-mono text-[11px] tracking-[0.16em] text-fg">{p.name}</p>
              </div>
              <h3 className="mt-6 text-lg font-medium tracking-tight text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-faint group-hover:text-fg">
                OPEN →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label-kicker">Discipline</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
                Don’t trust the claim. Verify the evidence.
              </h2>
            </div>
            <EvidenceStack
              labels={["IMPLEMENTED", "MEASURED", "REPRODUCIBLE", "MODELLED", "PROPOSED"]}
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Anything simulated says so. Anything demonstrated only locally says so. Anything
            measured on x86-64 rather than Termux says so. AOK is the kernel that enforces that
            sentence before a capability is allowed to execute or to speak in public.
          </p>
        </div>
      </section>

      <ProofCards />
      <PlatformModules />
      <Markets />

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <p className="label-kicker">Pilot</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-fg sm:text-4xl">
          Prove the economics before changing production.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          The commercial entry point is shadow mode. EDEN observes, classifies and calculates
          alternative strategies. AOK holds production execute until a measured validation exists.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/shadow">ENTER SHADOW MODE</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/pilot">DISCUSS A PILOT</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
