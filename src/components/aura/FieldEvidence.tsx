import type { EvidenceRow } from "@/lib/aura/types.ts";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  SENSOR: "text-keep",
  MEASURED: "text-keep",
  MODELLED: "text-modelled",
  PREDICTED: "text-structure",
  ESTIMATED: "text-detail",
  PLAY: "text-detail",
  MANUAL: "text-detail",
  "NOT MEASURED": "text-danger",
};

export function FieldEvidence({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div className="border border-line">
      <div className="border-b border-line px-3 py-2">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint">FIELD EVIDENCE</p>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-12 gap-2 border-t border-line px-3 py-2">
            <div className="col-span-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-faint">{r.label}</p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-fg">{r.value}</p>
            </div>
            <div className="col-span-3">
              <p className="font-mono text-[10px] tracking-[0.12em] text-faint">SOURCE</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">{r.source}</p>
            </div>
            <div className="col-span-3">
              <p className="font-mono text-[10px] tracking-[0.12em] text-faint">STATE</p>
              <p className={cn("mt-0.5 font-mono text-[11px] tracking-[0.1em]", TONE[r.state])}>
                {r.state}
              </p>
            </div>
            <div className="col-span-2 text-right">
              <p className="font-mono text-[10px] tracking-[0.12em] text-faint">UTC</p>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted">{r.timestamp}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
