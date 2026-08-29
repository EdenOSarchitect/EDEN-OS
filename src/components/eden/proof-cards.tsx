import { PROOF_CARDS } from "@/lib/eden";
import { EvidenceStack } from "./evidence-label";

export function ProofCards() {
  return (
    <section id="proof" className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="label-kicker">Investor-grade proof</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
        What is proven, and under which label.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Every metric carries an evidence class. Simulated or modelled results are never presented as
        physical measurements.
      </p>
      <div className="mt-8 grid gap-px bg-line border border-line sm:grid-cols-2">
        {PROOF_CARDS.map((card) => (
          <article key={card.id} className="bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.18em] text-faint">{card.kicker}</p>
              <EvidenceStack labels={card.labels} />
            </div>
            <p className="mt-6 font-mono text-3xl tabular-nums tracking-tight text-fg sm:text-4xl">
              {card.metric}
            </p>
            <h3 className="mt-3 text-sm font-medium text-fg">{card.title}</h3>
            <p className="mt-1 text-sm text-muted">{card.detail}</p>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">{card.caveats}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
