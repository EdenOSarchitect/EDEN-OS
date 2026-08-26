import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  STAGES,
  WORKLOADS,
  advanceBlocks,
  bytesKept,
  bytesVoided,
  classCounts,
  formatBytes,
  seedWorkload,
  sha256Hex,
  type BlockClass,
  type Marble,
  type StageId,
  type WorkBlock,
  type WorkloadPreset,
  POLICY_VERSION,
} from "@/lib/eden";
import { EvidenceStack } from "./evidence-label";
import { useMarbleLedger } from "@/lib/marble-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHIP: Record<BlockClass, string> = {
  RAW: "chip-raw",
  KEEP: "chip-keep",
  STRUCTURE: "chip-structure",
  DETAIL: "chip-detail",
  RESIDUAL: "chip-residual",
  VOID: "chip-void",
};

const STEP_MS = 720;

function runIdFrom(preset: WorkloadPreset, ts: number) {
  return `EDN-${new Date(ts).getUTCFullYear()}-${preset.id.slice(0, 3).toUpperCase()}-${(ts % 1_000_000)
    .toString(36)
    .toUpperCase()}`;
}

export function RefineryPipeline({
  onMarble,
}: {
  onMarble?: (m: Marble | null) => void;
}) {
  const push = useMarbleLedger((s) => s.push);
  const [presetId, setPresetId] = useState(WORKLOADS[0].id);
  const preset = WORKLOADS.find((w) => w.id === presetId) ?? WORKLOADS[0];
  const [stageIndex, setStageIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState<StageId>("sense");
  const [marble, setMarble] = useState<Marble | null>(null);
  const [runStamp, setRunStamp] = useState(0);
  const mounted = useRef(false);

  const blocks: WorkBlock[] = useMemo(() => {
    let b = seedWorkload(preset);
    for (let i = 1; i <= stageIndex; i++) b = advanceBlocks(b, i, preset);
    return b;
  }, [preset, stageIndex, runStamp]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (stageIndex >= STAGES.length - 1) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setStageIndex((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, stageIndex]);

  useEffect(() => {
    if (stageIndex < STAGES.length - 1) {
      setMarble(null);
      onMarble?.(null);
      return;
    }
    const ts = Date.now();
    const counts = classCounts(blocks);
    const payload = JSON.stringify({
      preset: preset.id,
      counts,
      bytesIn: preset.bytesIn,
      bytesOut: bytesKept(blocks),
      policy: POLICY_VERSION,
    });
    void sha256Hex(payload).then(async (outHash) => {
      const inHash = await sha256Hex(`${preset.id}:${preset.seed}:${preset.bytesIn}`);
      const id = runIdFrom(preset, ts);
      const full = await sha256Hex(`${id}|${inHash}|${outHash}|${POLICY_VERSION}|${ts}`);
      if (!mounted.current) return;
      const m: Marble = {
        runId: id,
        sha256: full,
        timestamp: new Date(ts).toISOString(),
        inputCommitment: inHash,
        outputCommitment: outHash,
        policyVersion: POLICY_VERSION,
        verificationStatus: "VALID",
        bytesIn: preset.bytesIn,
        bytesOut: bytesKept(blocks),
        counts,
        workloadId: preset.id,
        evidence: "DEMONSTRATION",
        provenance: [
          "SENSE",
          "DECOMPOSE",
          "MEASURE",
          "KEEP/VOID",
          "REGENERATE",
          "NAVIGATE",
          "VSURF",
          "TRANSMIT",
          "RECOMPOSE",
          "VERIFY",
        ],
      };
      setMarble(m);
      onMarble?.(m);
      push({ ...m, kind: "REFINERY" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex, preset.id, runStamp]);

  function run() {
    setMarble(null);
    onMarble?.(null);
    setStageIndex(0);
    setSelected("sense");
    setRunStamp((n) => n + 1);
    setPlaying(true);
  }

  const active = STAGES[stageIndex];
  const shown = STAGES.find((s) => s.id === selected) ?? active;
  const counts = classCounts(blocks);
  const kept = bytesKept(blocks);
  const voided = bytesVoided(blocks);
  const classified = stageIndex >= 3;

  const byStage = (i: number) => {
    if (i > stageIndex) return [];
    if (i < stageIndex && i < 8) {
      return blocks.filter((_, idx) => idx % STAGES.length === i).slice(0, 6);
    }
    return blocks;
  };

  return (
    <section id="live" className="border-y border-line bg-panel">
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-kicker">Live refinery</p>
            <h2 className="mt-1 text-lg font-medium tracking-tight text-fg sm:text-xl">
              Workload in. Verified value out.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="workload">
              Workload
            </label>
            <select
              id="workload"
              value={presetId}
              onChange={(e) => {
                setPresetId(e.target.value);
                setStageIndex(0);
                setPlaying(true);
                setMarble(null);
              }}
              className="h-11 min-w-[12rem] border border-line-strong bg-surface px-3 font-mono text-xs text-fg"
            >
              {WORKLOADS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button type="button" onClick={run} size="md">
              <Play className="size-3.5" />
              RUN THE REFINERY
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPlaying((p) => !p)}
              size="md"
            >
              <RotateCcw className="size-3.5" />
              {playing ? "PAUSE" : "RESUME"}
            </Button>
          </div>
        </div>

        <p className="mb-4 max-w-3xl font-mono text-[11px] leading-relaxed tracking-wide text-muted">
          {preset.domain} · {preset.description} Envelope {formatBytes(preset.bytesIn)} · deadline{" "}
          {preset.deadlineMs} ms · compute {preset.computeMs} ms
        </p>

        <ol className="mb-3 hidden overflow-hidden border border-line text-[10px] font-mono tracking-[0.12em] text-muted sm:flex">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 border-r border-line py-1.5 last:border-r-0",
                i === stageIndex && "bg-elevated text-fg",
                i < stageIndex && "text-keep",
              )}
            >
              {s.name}
              {i < STAGES.length - 1 ? <span className="text-faint">→</span> : null}
            </li>
          ))}
        </ol>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-[980px] gap-px bg-line border border-line">
            {STAGES.map((stage, i) => {
              const chips =
                i === stageIndex
                  ? blocks
                  : i < stageIndex
                    ? byStage(i).slice(0, 14)
                    : [];
              const isActive = i === stageIndex;
              const isSel = stage.id === selected;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelected(stage.id)}
                  className={cn(
                    "flex min-h-[168px] flex-1 flex-col bg-surface p-2 text-left transition-[background-color] duration-150",
                    isSel && "bg-elevated",
                    isActive && "outline outline-1 outline-accent -outline-offset-1",
                  )}
                >
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 font-mono text-[11px] tracking-[0.08em] text-muted",
                      isActive && "text-fg",
                    )}
                  >
                    {stage.name}
                  </span>
                  <div className="mt-3 flex flex-wrap content-start gap-1 min-h-[72px]">
                    {(i === stageIndex ? blocks : chips).slice(0, 28).map((b) => (
                      <span
                        key={b.id + i}
                        title={`${b.label} ${b.klass}`}
                        className={cn("chip", CHIP[i < 3 && i === stageIndex ? b.klass : b.klass])}
                      />
                    ))}
                    {i > stageIndex ? (
                      <span className="font-mono text-[10px] text-faint">queued</span>
                    ) : null}
                  </div>
                  <span className="mt-auto pt-2 font-mono text-[10px] tabular-nums text-faint">
                    {i === stageIndex
                      ? `${blocks.length} units`
                      : i < stageIndex
                        ? "passed"
                        : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-px bg-line border border-line sm:grid-cols-4">
          <Hud label="COMPUTE WINDOW" value={`${preset.computeMs} ms`} note="envelope" />
          <Hud label="BANDWIDTH" value={`${preset.bandwidthMb} MB`} note="envelope" />
          <Hud
            label="PAYLOAD OUT"
            value={classified ? formatBytes(kept) : "—"}
            note={classified ? `voided ${formatBytes(voided)}` : "awaiting classify"}
          />
          <Hud
            label="DEADLINE"
            value={`${preset.deadlineMs} ms`}
            note={playing ? "window open" : "frozen"}
          />
        </div>

        {classified ? (
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] tracking-wide text-muted">
            {(["KEEP", "STRUCTURE", "DETAIL", "RESIDUAL", "VOID"] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-2">
                <span className={cn("chip", CHIP[k])} />
                {k} {counts[k]}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-px border border-line bg-line lg:grid-cols-3">
          <Field kicker="INPUT" body={shown.input} />
          <Field kicker="DECISION" body={shown.decision} />
          <Field
            kicker="EVIDENCE"
            body={shown.note}
            extra={<EvidenceStack labels={shown.evidence} />}
          />
        </div>

        {marble ? <MarblePanel marble={marble} /> : <MarblePlaceholder />}
      </div>
    </section>
  );
}

function Hud({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-fg">{value}</p>
      <p className="font-mono text-[10px] text-muted">{note}</p>
    </div>
  );
}

function Field({
  kicker,
  body,
  extra,
}: {
  kicker: string;
  body: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="label-kicker">{kicker}</p>
        {extra}
      </div>
      <p className="text-sm leading-relaxed text-fg">{body}</p>
    </div>
  );
}

function MarblePlaceholder() {
  return (
    <div className="mt-3 border border-dashed border-line px-4 py-6 text-center">
      <p className="font-mono text-[11px] tracking-[0.16em] text-faint">
        MARBLE — PENDING VERIFY
      </p>
      <p className="mt-2 text-sm text-muted">
        A Marble is minted when the run reaches VERIFY: run ID, SHA-256, timestamp, commitments,
        policy version, verification status.
      </p>
    </div>
  );
}

export function MarblePanel({ marble }: { marble: Marble }) {
  return (
    <div className="mt-3 border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="font-mono text-[11px] tracking-[0.16em] text-fg">MARBLE MINTED</p>
        <EvidenceStack labels={[marble.evidence, "IMPLEMENTED"]} />
      </div>
      <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        <KV k="Run ID" v={marble.runId} />
        <KV k="SHA-256" v={marble.sha256} mono />
        <KV k="Timestamp" v={marble.timestamp} />
        <KV k="Input commitment" v={marble.inputCommitment} mono />
        <KV k="Output commitment" v={marble.outputCommitment} mono />
        <KV k="Policy version" v={marble.policyVersion} />
        <KV k="Verification" v={marble.verificationStatus} />
        <KV k="Bytes in → out" v={`${formatBytes(marble.bytesIn)} → ${formatBytes(marble.bytesOut)}`} />
        <KV
          k="Provenance path"
          v={marble.provenance.join(" → ")}
        />
      </dl>
      <p className="px-4 py-3 font-mono text-[10px] leading-relaxed text-faint">
        Client demonstration. Hashes computed in-browser from the run transcript. Not an externally
        anchored production mint. See Merkle 1 GiB experiment for a reproducible proof result.
      </p>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint">{k}</dt>
      <dd
        className={cn(
          "mt-1 break-all text-xs text-fg",
          mono && "font-mono text-[11px] tracking-tight",
        )}
      >
        {v}
      </dd>
    </div>
  );
}
