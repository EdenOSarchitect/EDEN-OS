import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EvidencePanel } from "./evidence-panel";
import { ProofCards } from "./proof-cards";
import { EvidenceStack } from "./evidence-label";

export function EvidencePage() {
  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">Evidence lab</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
            Don’t trust the claim. Verify the evidence class.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Methodology, sample size, hashes and the label that AOK will actually read. Simulated
            results stay labelled. Measured results stay scoped.
          </p>
          <div className="mt-6">
            <EvidenceStack
              labels={["MEASURED", "REPRODUCIBLE", "IMPLEMENTED", "MODELLED", "PROPOSED"]}
            />
          </div>
        </div>
      </section>
      <ProofCards />
      <EvidencePanel />
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <p className="label-kicker">Next</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg">
          AOK is the kernel that treats this table as an admission control list.
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/aok">OPEN AOK</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/refinery">RUN THE REFINERY</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
