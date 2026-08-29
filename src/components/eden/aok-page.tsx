import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EvidenceLabel, EvidenceStack } from "./evidence-label";
import {
  AOK_ACTIONS,
  AOK_CAPABILITIES,
  AOK_POLICY,
  aokDecide,
  aokMatrix,
  fleetSummary,
  type AokAction,
  type AokCapability,
  type AokVerdict,
} from "@/lib/aok";
import { POLICY_VERSION, sha256Hex, type Marble } from "@/lib/eden";
import { useMarbleLedger } from "@/lib/marble-store";
import { cn } from "@/lib/utils";

const VERDICT_TONE: Record<AokVerdict, string> = {
  CLEARED: "text-keep border-keep/40 bg-keep/10",
  HOLD: "text-modelled border-modelled/40 bg-modelled/10",
  DENIED: "text-danger border-danger/40 bg-danger/10",
};

const CELL: Record<AokVerdict, string> = {
  CLEARED: "text-keep",
  HOLD: "text-modelled",
  DENIED: "text-danger",
};

export function AokPage() {
  const [capId, setCapId] = useState(AOK_CAPABILITIES[0].id);
  const [action, setAction] = useState<AokAction>("EXECUTE_PRODUCTION");
  const [marble, setMarble] = useState<Marble | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useMarbleLedger((s) => s.push);

  const cap = AOK_CAPABILITIES.find((c) => c.id === capId) ?? AOK_CAPABILITIES[0];
  const decision = useMemo(() => aokDecide(cap, action), [cap, action]);
  const fleet = useMemo(() => fleetSummary(), []);

  async function mintClearance() {
    setBusy(true);
    const ts = Date.now();
    const payload = JSON.stringify({
      capability: cap.id,
      action,
      verdict: decision.verdict,
      rule: decision.rule,
      labels: cap.labels,
      policy: AOK_POLICY,
    });
    const outHash = await sha256Hex(payload);
    const inHash = await sha256Hex(`${cap.id}:${action}:${cap.lastHash ?? "none"}`);
    const runId = `AOK-${new Date(ts).getUTCFullYear()}-${cap.id.slice(0, 3).toUpperCase()}-${(ts % 1_000_000)
      .toString(36)
      .toUpperCase()}`;
    const full = await sha256Hex(`${runId}|${inHash}|${outHash}|${AOK_POLICY}|${ts}`);
    const m: Marble = {
      runId,
      sha256: full,
      timestamp: new Date(ts).toISOString(),
      inputCommitment: inHash,
      outputCommitment: outHash,
      policyVersion: AOK_POLICY,
      verificationStatus: decision.verdict === "DENIED" ? "VOID" : "VALID",
      bytesIn: 0,
      bytesOut: 0,
      counts: { RAW: 0, KEEP: 0, STRUCTURE: 0, DETAIL: 0, RESIDUAL: 0, VOID: 0 },
      workloadId: cap.id,
      evidence: "DEMONSTRATION",
      provenance: ["AOK", cap.project, action, decision.verdict, decision.rule],
      kind: "AOK",
      aokVerdict: decision.verdict,
    };
    setMarble(m);
    push(m);
    setBusy(false);
  }

  return (
    <SiteShell>
      <Hero fleet={fleet} />

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1400px] gap-px lg:grid-cols-2">
          <div className="px-4 py-12 sm:px-6">
            <p className="label-kicker">Problem</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              Traditional stacks execute, then log.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              A dashboard can display any number. A pitch deck can upgrade a simulation into a
              product. Nothing in the execution path is required to read the evidence class of the
              claim it is about to act on.
            </p>
          </div>
          <div className="border-t border-line px-4 py-12 sm:px-6 lg:border-l lg:border-t-0">
            <p className="label-kicker">Thesis</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              AOK admits, then executes.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              EDEN AOK is the attested operational kernel. It binds policy, evidence class and
              requested action so a capability cannot silently become operational. Observe is not
              execute. Modelled is not measured. Implemented is not production.
            </p>
          </div>
        </div>
      </section>

      <FleetMatrix selectedId={capId} onSelect={setCapId} />

      <section id="clearance" className="border-y border-line bg-panel">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label-kicker">Live clearance</p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-fg sm:text-2xl">
                Request an action. AOK returns the verdict that the evidence class actually supports.
              </h2>
            </div>
            <EvidenceStack labels={["IMPLEMENTED", "DEMONSTRATION"]} />
          </div>

          <div className="grid gap-px border border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="bg-surface p-4 sm:p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-faint">CAPABILITY</p>
              <div className="mt-3 grid gap-1">
                {AOK_CAPABILITIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCapId(c.id)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 border px-3 text-left transition-[background-color,border-color] duration-150",
                      capId === c.id
                        ? "border-accent bg-elevated text-fg"
                        : "border-transparent text-muted hover:border-line hover:bg-elevated hover:text-fg",
                    )}
                  >
                    <span className="text-sm">{c.name}</span>
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-faint">
                      {c.project}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface p-4 sm:p-5">
              <CapabilityCard cap={cap} />
              <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-faint">ACTION</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {AOK_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAction(a.id)}
                    className={cn(
                      "min-h-14 border px-3 py-2 text-left transition-[background-color,border-color] duration-150",
                      action === a.id
                        ? "border-accent bg-elevated"
                        : "border-line hover:border-line-strong hover:bg-elevated",
                    )}
                  >
                    <span className="block font-mono text-[11px] tracking-[0.12em] text-fg">{a.name}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted">{a.intent}</span>
                  </button>
                ))}
              </div>

              <VerdictPanel decision={decision} action={action} cap={cap} />

              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void mintClearance()} disabled={busy} size="lg">
                  {busy ? "MINTING…" : "MINT AOK MARBLE"}
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/marbles">VIEW LEDGER</Link>
                </Button>
              </div>

              {marble ? <AokMarble marble={marble} /> : null}
            </div>
          </div>
        </div>
      </section>

      <Rules />
      <Relation />
    </SiteShell>
  );
}

function Hero({ fleet }: { fleet: { n: number; cleared: number; hold: number; denied: number } }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
        <p className="label-kicker">EDEN AOK · Attested Operational Kernel</p>
        <h1 className="mt-4 max-w-[20ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl lg:text-[3.4rem]">
          AOK is how EDEN refuses to run on an unsupported claim.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Every capability carries an evidence class. AOK is the kernel that reads that class before
          a workload is observed, modelled, executed or publicly claimed.
        </p>
        <p className="mt-6 max-w-3xl font-mono text-[11px] leading-relaxed tracking-wide text-faint">
          Policy {AOK_POLICY} · {fleet.n} capabilities · production execute {fleet.hold} HOLD ·{" "}
          {fleet.denied} DENIED · {fleet.cleared} CLEARED
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#clearance">RUN A CLEARANCE</a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <a href="#matrix">VIEW THE BOARD</a>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/pilot">DISCUSS A PILOT</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FleetMatrix({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section id="matrix" className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="label-kicker">Go / no-go board</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
        One architecture. Twelve labelled capabilities. Six admissible actions.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        This is the investor-visible difference. ChronoNav can be reproduced. It cannot take
        production control. AURA geometry can be modelled. Physical RF cannot be claimed as
        measured. The satellite network is not claimed at all.
      </p>

      <div className="mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[860px] border-collapse border border-line text-left">
          <thead className="bg-elevated">
            <tr className="font-mono text-[10px] tracking-[0.12em] text-faint">
              <th className="px-3 py-3 font-medium">CAPABILITY</th>
              <th className="px-3 py-3 font-medium">CLASS</th>
              {AOK_ACTIONS.map((a) => (
                <th key={a.id} className="px-2 py-3 text-center font-medium">
                  {a.id === "EXECUTE_LAB"
                    ? "LAB"
                    : a.id === "EXECUTE_PRODUCTION"
                      ? "PROD"
                      : a.id === "CLAIM_MEASURED"
                        ? "CLAIM"
                        : a.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AOK_CAPABILITIES.map((cap) => {
              const matrix = aokMatrix(cap);
              const selected = cap.id === selectedId;
              return (
                <tr
                  key={cap.id}
                  className={cn(
                    "border-t border-line",
                    selected && "bg-elevated",
                  )}
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(cap.id)}
                      className="text-left text-sm text-fg hover:text-accent"
                    >
                      {cap.name}
                      <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] text-faint">
                        {cap.project}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <EvidenceStack labels={cap.labels} />
                  </td>
                  {AOK_ACTIONS.map((a) => (
                    <td key={a.id} className="px-2 py-3 text-center">
                      <span
                        className={cn(
                          "font-mono text-[10px] tracking-[0.08em]",
                          CELL[matrix[a.id].verdict],
                        )}
                      >
                        {matrix[a.id].verdict === "CLEARED"
                          ? "A-OK"
                          : matrix[a.id].verdict}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">
        A-OK = CLEARED under policy {AOK_POLICY}. HOLD is not a yes. DENIED is not a maybe.
        Production execute is HOLD or DENIED for every current capability — by design.
      </p>
    </section>
  );
}

function CapabilityCard({ cap }: { cap: AokCapability }) {
  return (
    <div className="border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-faint">{cap.project}</p>
          <h3 className="mt-1 text-base font-medium text-fg">{cap.name}</h3>
        </div>
        <EvidenceStack labels={cap.labels} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg">{cap.claim}</p>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-faint">{cap.scope}</p>
      {cap.lastHash ? (
        <p className="mt-2 font-mono text-[11px] text-muted">ID {cap.lastHash}</p>
      ) : null}
    </div>
  );
}

function VerdictPanel({
  decision,
  action,
  cap,
}: {
  decision: ReturnType<typeof aokDecide>;
  action: AokAction;
  cap: AokCapability;
}) {
  return (
    <div className="mt-6 border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] tracking-[0.16em] text-fg">AOK VERDICT</p>
        <span
          className={cn(
            "inline-flex items-center border px-2 py-1 font-mono text-xs tracking-[0.16em]",
            VERDICT_TONE[decision.verdict],
          )}
        >
          {decision.verdict === "CLEARED" ? "A-OK · CLEARED" : decision.verdict}
        </span>
      </div>
      <dl className="grid gap-px bg-line sm:grid-cols-3">
        <div className="bg-surface px-4 py-3">
          <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">Rule</dt>
          <dd className="mt-1 font-mono text-sm text-fg">{decision.rule}</dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">Action</dt>
          <dd className="mt-1 font-mono text-sm text-fg">{action}</dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">Capability</dt>
          <dd className="mt-1 text-sm text-fg">{cap.name}</dd>
        </div>
      </dl>
      <p className="px-4 py-3 text-sm leading-relaxed text-muted">{decision.note}</p>
    </div>
  );
}

function AokMarble({ marble }: { marble: Marble }) {
  return (
    <div className="mt-5 border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="font-mono text-[11px] tracking-[0.16em] text-fg">AOK MARBLE MINTED</p>
        <EvidenceLabel label="DEMONSTRATION" />
      </div>
      <dl className="grid gap-px bg-line sm:grid-cols-2">
        <KV k="Run ID" v={marble.runId} />
        <KV k="Verdict" v={marble.aokVerdict ?? "—"} />
        <KV k="SHA-256" v={marble.sha256} mono />
        <KV k="Policy" v={marble.policyVersion} />
        <KV k="Input commitment" v={marble.inputCommitment} mono />
        <KV k="Output commitment" v={marble.outputCommitment} mono />
      </dl>
      <p className="px-4 py-3 font-mono text-[10px] leading-relaxed text-faint">
        Client demonstration. Hashes computed in-browser from the clearance transcript. Not a
        production admission event. See /marbles for the session ledger.
      </p>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">{k}</dt>
      <dd className={cn("mt-1 break-all text-xs text-fg", mono && "font-mono text-[11px]")}>{v}</dd>
    </div>
  );
}

function Rules() {
  const rows = [
    {
      id: "R0–R2",
      title: "Observe is always open",
      body: "Read-only observation, including of a NOT CLAIMED surface, is CLEARED. This is why shadow mode is the commercial entry point.",
    },
    {
      id: "R3–R4",
      title: "Measured cannot be inferred",
      body: "A MEASURED claim is CLEARED only when the capability already carries MEASURED. Simulations, synthetics and models cannot be promoted by copy.",
    },
    {
      id: "R5–R7",
      title: "Production execute is gated",
      body: "No current capability is CLEARED for production execute. Implemented and locally measured surfaces HOLD. Modelled and unmeasured surfaces DENY.",
    },
    {
      id: "R8–R13",
      title: "Lab, reproduce, model stay labelled",
      body: "Lab execution of an implemented surface is CLEARED. Reproduction of a published hash is CLEARED. Modelling never upgrades the evidence class.",
    },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <p className="label-kicker">Policy</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
        The kernel is a rule table, not a vibe.
      </h2>
      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
        {rows.map((r) => (
          <article key={r.id} className="bg-surface p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] text-faint">{r.id}</p>
            <h3 className="mt-2 text-base font-medium text-fg">{r.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 font-mono text-[11px] text-faint">
        Default if unclassified: HOLD. AOK never fails open. Policy {AOK_POLICY} · refinery{" "}
        {POLICY_VERSION}.
      </p>
    </section>
  );
}

function Relation() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <p className="label-kicker">In the stack</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          Refinery decides what is valuable. AOK decides what is admissible.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          ChronoNav schedules remaining work. Progressive Return extracts the feasible surface.
          Marble records what happened. AURA extends the same control architecture to the edge.
          AOK sits across all of them: it is the refusal to treat a labelled research result as an
          operational fact.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/refinery">RUN THE REFINERY</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/evidence">VIEW THE EVIDENCE</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/pilot">DISCUSS A PILOT</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
