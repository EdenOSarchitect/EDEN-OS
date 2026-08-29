import { AURA_TRUTH, MARKETS, MODULES } from "@/lib/eden";
import { EvidenceLabel } from "./evidence-label";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PlatformModules() {
  return (
    <section id="modules" className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="label-kicker">Platform</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
        Six modules. One control architecture.
      </h2>
      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <a
            key={m.id}
            href={m.href}
            className={
              m.id === "aura"
                ? "bg-surface p-5 hover:bg-elevated"
                : "bg-surface p-5 hover:bg-elevated"
            }
          >
            <p className="font-mono text-[11px] tracking-[0.16em] text-fg">{m.name}</p>
            <p className="mt-3 text-sm font-medium text-fg">{m.role}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
          </a>
        ))}
      </div>

      <div className="mt-8 border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-fg">
              AURA — DISTRIBUTED INFRASTRUCTURE R&D
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Shown last, and labelled. Ambition without a truth panel is a pitch deck. This is the
              truth panel.
            </p>
          </div>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AURA_TRUTH.map((row) => (
            <li
              key={row.item}
              className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-3"
            >
              <span className="text-sm text-fg">{row.item}</span>
              <EvidenceLabel label={row.label} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Markets() {
  return (
    <section id="markets" className="border-y border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <p className="label-kicker">Markets</p>
        <h2 className="mt-2 max-w-xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          One control architecture. Multiple constrained-compute markets.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          These are not seven unrelated businesses. They are the same question asked wherever
          compute, energy, bandwidth or time is scarce.
        </p>
        <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {MARKETS.map((m, i) => (
            <li key={m.name} className="bg-surface p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-faint">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-mono text-xs tracking-[0.12em] text-fg">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PilotCta() {
  return (
    <section id="pilot" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
      <p className="label-kicker">Pilot</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-fg sm:text-4xl">
        Prove the economics before changing production.
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        The commercial entry point is shadow mode: EDEN observes, classifies and calculates
        alternative strategies. Execution control is a later decision.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href="#live">RUN THE REFINERY</a>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to="/evidence">VIEW THE EVIDENCE</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to="/pilot">DISCUSS A PILOT</Link>
        </Button>
      </div>
    </section>
  );
}
