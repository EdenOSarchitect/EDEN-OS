import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";

const ROWS = [
  ["Live app", "https://edenrefineryv2.grok.me/"],
  ["Grok project", "01a03327-e789-71d2-87ff-e44d7945f788"],
  ["GitHub", "Not exported — use Publish → Export to GitHub"],
  ["Archive", "/eden-refinery-v2-source.tar.gz"],
];

const SURFACES = [
  "/refinery",
  "/aura",
  "/aok",
  "/shadow",
  "/marbles",
  "/evidence",
  "/pilot",
];

export function SourcePage() {
  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="label-kicker">Source</p>
          <h1 className="mt-4 max-w-[18ch] text-[2.15rem] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
            EDEN Refinery V2 source, exposed.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            This is the live Grok deployment source. It is not a clone. GitHub
            export is a Publish action; until that exists, download the archive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="/eden-refinery-v2-source.tar.gz" download>
                DOWNLOAD SOURCE ARCHIVE
              </a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="/HANDOFF.md">OPEN HANDOFF</a>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <p className="label-kicker">Identity</p>
        <dl className="mt-6 divide-y divide-line border border-line">
          {ROWS.map(([k, v]) => (
            <div
              key={k}
              className="grid gap-1 px-4 py-4 sm:grid-cols-[160px_1fr] sm:items-baseline sm:gap-6"
            >
              <dt className="font-mono text-[11px] tracking-[0.14em] text-faint">{k}</dt>
              <dd className="break-all font-mono text-sm text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 label-kicker">Surfaces in this tree</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SURFACES.map((s) => (
            <li
              key={s}
              className="border border-line px-3 py-2 font-mono text-[11px] tracking-[0.12em] text-muted"
            >
              {s}
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
