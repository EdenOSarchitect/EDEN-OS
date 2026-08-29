import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { MARKETS } from "@/lib/eden";
import { EvidenceLabel } from "./evidence-label";

interface Brief {
  id: string;
  name: string;
  org: string;
  role: string;
  email: string;
  market: string;
  notes: string;
  at: string;
}

const KEY = "eden.pilot-briefs.v1";

function loadBriefs(): Brief[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Brief[]) : [];
  } catch {
    return [];
  }
}

export function PilotPage() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [market, setMarket] = useState(MARKETS[0].name);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !org.trim() || !email.trim()) {
      setError("Name, organisation and email are required.");
      return;
    }
    const brief: Brief = {
      id: `PIL-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      org: org.trim(),
      role: role.trim(),
      email: email.trim(),
      market,
      notes: notes.trim(),
      at: new Date().toISOString(),
    };
    const next = [brief, ...loadBriefs()].slice(0, 20);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(brief);
    setError(null);
  }

  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">Pilot · start read-only</p>
          <h1 className="mt-4 max-w-[16ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
            Supply telemetry. EDEN observes first.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            The entry point is shadow mode. AOK holds production execute. A pilot is a measured
            comparison, not a cutover.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-px border-b border-line lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form className="px-4 py-12 sm:px-6" onSubmit={onSubmit}>
          <p className="label-kicker">Brief</p>
          <p className="mt-2 text-sm text-muted">
            Stored in this browser only. This console does not send mail or open a ticket. Use it
            to draft a briefing packet, then follow up directly.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={name} onChange={setName} required />
            <Field label="Organisation" value={org} onChange={setOrg} required />
            <Field label="Role" value={role} onChange={setRole} />
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <label className="block sm:col-span-2">
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted">Market</span>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="mt-2 h-11 w-full border border-line-strong bg-surface px-3 text-sm text-fg"
              >
                {MARKETS.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted">
                Workload notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="mt-2 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-fg"
                placeholder="Tokens, GPU hours, latency SLO, what you would let EDEN observe first."
              />
            </label>
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <div className="mt-6">
            <Button type="submit" size="lg">
              RECORD PILOT BRIEF
            </Button>
          </div>
          {saved ? (
            <div className="mt-6 border border-line bg-panel p-4">
              <p className="font-mono text-[11px] tracking-[0.16em] text-keep">BRIEF RECORDED</p>
              <p className="mt-2 font-mono text-sm text-fg">{saved.id}</p>
              <p className="mt-2 text-sm text-muted">
                {saved.org} · {saved.market}. This is a local draft, not a received enquiry.
              </p>
            </div>
          ) : null}
        </form>

        <aside className="border-t border-line px-4 py-12 sm:px-6 lg:border-l lg:border-t-0">
          <p className="label-kicker">Sequence</p>
          <ol className="mt-6 space-y-5">
            {[
              ["01 OBSERVE", "Supply telemetry or workload history. Read-only."],
              ["02 BASELINE", "Measure current behaviour as it actually runs."],
              ["03 REFINE", "Generate alternative execution strategies."],
              ["04 COMPARE", "Calculate baseline vs counterfactual vs delta."],
              ["05 VERIFY", "Produce Evidence Marbles. AOK records the class."],
              ["06 DEPLOY", "Only after validation. Execution control is not the entry point."],
            ].map(([t, b]) => (
              <li key={t}>
                <p className="font-mono text-[11px] tracking-[0.14em] text-fg">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <EvidenceLabel label="PROPOSED" />
            <p className="mt-3 text-sm text-muted">
              No active customer deployment is claimed on this site.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link to="/shadow">ENTER SHADOW</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/aok">OPEN AOK</Link>
            </Button>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] tracking-[0.12em] text-muted">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full border border-line-strong bg-surface px-3 text-sm text-fg"
      />
    </label>
  );
}
