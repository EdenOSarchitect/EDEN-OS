import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EvidenceLabel, EvidenceStack } from "./evidence-label";
import { EVIDENCE_ROWS, formatBytes, type Marble } from "@/lib/eden";
import { useMarbleLedger } from "@/lib/marble-store";

export function MarblesPage() {
  const session = useMarbleLedger((s) => s.session);
  const clearSession = useMarbleLedger((s) => s.clearSession);

  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">EDEN Marbles · provenance</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
            Every persistent decision has identity, a hash, and an evidence class.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            A Marble is EDEN’s universal persistent object. The evidence class on a Marble cannot
            silently increase. AOK reads that class before the next action is admitted.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <EvidenceLabel label="IMPLEMENTED" />
            <EvidenceLabel label="REPRODUCIBLE" />
            <EvidenceLabel label="DEMONSTRATION" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-kicker">Session ledger</p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-fg">
              Marbles minted in this browser.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Refinery runs, AOK clearances and AURA geometry captures mint here. Hashes are computed
              locally. They are not an externally anchored public timestamp. A signed MODELLED record
              stays MODELLED.
            </p>
          </div>
          {session.length ? (
            <Button type="button" variant="secondary" onClick={clearSession}>
              CLEAR SESSION
            </Button>
          ) : null}
        </div>

        {session.length === 0 ? (
          <div className="mt-8 border border-dashed border-line px-4 py-10 text-center">
            <p className="font-mono text-[11px] tracking-[0.16em] text-faint">LEDGER EMPTY</p>
            <p className="mt-2 text-sm text-muted">
              Run the refinery, mint an AOK clearance, or capture an AURA geometry marble.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/refinery">RUN THE REFINERY</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/aok">OPEN AOK</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/aura">OPEN AURA FIELD</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-8 grid gap-px border border-line bg-line">
            {session.map((m) => (
              <MarbleRow key={m.runId} marble={m} />
            ))}
          </ul>
        )}
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <p className="label-kicker">Published artefacts</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg">
            Evidence IDs from reproducible runs — not live mints.
          </h2>
          <div className="mt-8 overflow-x-auto border border-line">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-elevated">
                <tr className="font-mono text-[10px] tracking-[0.14em] text-faint">
                  <th className="px-3 py-3 font-medium">SURFACE</th>
                  <th className="px-3 py-3 font-medium">RESULT</th>
                  <th className="px-3 py-3 font-medium">CLASS</th>
                  <th className="px-3 py-3 font-medium">ID</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE_ROWS.filter((r) => r.hash).map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3 text-sm text-fg">{row.surface}</td>
                    <td className="px-3 py-3 font-mono text-xs text-fg">{row.result}</td>
                    <td className="px-3 py-3">
                      <EvidenceStack labels={row.labels} />
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-faint">{row.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function MarbleRow({ marble }: { marble: Marble }) {
  return (
    <li className="bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-fg">{marble.runId}</p>
          <p className="mt-1 font-mono text-[11px] text-faint">{marble.timestamp}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {marble.kind ? <EvidenceLabel label="DEMONSTRATION" /> : null}
          <EvidenceLabel label={marble.evidence} />
          {marble.aokVerdict ? (
            <span className="inline-flex items-center border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted">
              {marble.aokVerdict}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 break-all font-mono text-[11px] text-muted">{marble.sha256}</p>
      <p className="mt-2 font-mono text-[11px] text-faint">
        {marble.kind ?? "REFINERY"} · {marble.policyVersion}
        {marble.bytesIn
          ? ` · ${formatBytes(marble.bytesIn)} → ${formatBytes(marble.bytesOut)}`
          : null}
      </p>
    </li>
  );
}
