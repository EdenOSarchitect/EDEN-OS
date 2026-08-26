import { cn } from "@/lib/utils";
import type { EvidenceClass } from "@/lib/eden";

const TONE: Record<EvidenceClass, string> = {
  MEASURED: "text-measured border-measured/40",
  REPRODUCIBLE: "text-structure border-structure/40",
  IMPLEMENTED: "text-structure border-structure/40",
  MODELLED: "text-modelled border-modelled/40",
  PROPOSED: "text-proposed border-proposed/50",
  SYNTHETIC: "text-modelled border-modelled/40",
  SIMULATED: "text-modelled border-modelled/40",
  COUNTERFACTUAL: "text-modelled border-modelled/40",
  ESTIMATE: "text-modelled border-modelled/40",
  "NOT MEASURED": "text-danger border-danger/40",
  "NOT CLAIMED": "text-danger border-danger/40",
  UNSUPPORTED: "text-danger border-danger/40",
  "PARTIALLY MEASURED": "text-detail border-detail/40",
  DEMONSTRATION: "text-muted border-line-strong",
};

export function EvidenceLabel({
  label,
  className,
}: {
  label: EvidenceClass;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.14em] uppercase",
        TONE[label],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function EvidenceStack({ labels }: { labels: EvidenceClass[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {labels.map((l) => (
        <EvidenceLabel key={l} label={l} />
      ))}
    </span>
  );
}
