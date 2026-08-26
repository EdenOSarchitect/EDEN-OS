import { EVIDENCE_ROWS } from "@/lib/eden";
import { EvidenceStack } from "./evidence-label";

export function EvidencePanel() {
  return (
    <section id="evidence" className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="label-kicker">Evidence lab</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
        Methodology, sample size, and hashes.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Don't trust the claim. Verify the evidence class. Anything simulated says so. Anything
        demonstrated only locally says so. Anything measured on x86-64 rather than Termux says so.
      </p>

      <div className="mt-8 overflow-x-auto border border-line">
        <table className="min-w-[860px] w-full border-collapse text-left">
          <thead className="bg-elevated">
            <tr className="font-mono text-[10px] tracking-[0.14em] text-faint">
              <th className="px-3 py-3 font-medium">SURFACE</th>
              <th className="px-3 py-3 font-medium">CLAIM</th>
              <th className="px-3 py-3 font-medium">N</th>
              <th className="px-3 py-3 font-medium">RESULT</th>
              <th className="px-3 py-3 font-medium">CLASS</th>
              <th className="px-3 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {EVIDENCE_ROWS.map((row) => (
              <tr key={row.id} className="border-t border-line align-top">
                <td className="px-3 py-3 text-sm text-fg">{row.surface}</td>
                <td className="px-3 py-3 text-sm text-muted">
                  {row.claim}
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-faint">{row.method}</p>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-fg whitespace-nowrap">{row.n}</td>
                <td className="px-3 py-3 font-mono text-xs text-fg">{row.result}</td>
                <td className="px-3 py-3">
                  <EvidenceStack labels={row.labels} />
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-faint">{row.hash ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
