import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/eden";

const NAV = [
  { to: "/refinery", label: "Refinery" },
  { to: "/aura", label: "AURA" },
  { to: "/aok", label: "AOK" },
  { to: "/shadow", label: "Shadow" },
  { to: "/marbles", label: "Marbles" },
  { to: "/evidence", label: "Evidence" },
  { to: "/pilot", label: "Pilot" },
];

export function SiteShell({
  children,
  mode,
  onMode,
}: {
  children: React.ReactNode;
  mode?: ViewMode;
  onMode?: (m: ViewMode) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="grid-surface min-h-dvh text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-sans text-[15px] font-semibold tracking-[0.18em] text-fg">
              EDEN
            </span>
            <span className="hidden font-mono text-[10px] tracking-[0.22em] text-faint sm:inline">
              OS
            </span>
          </Link>

          {onMode ? (
            <nav
              aria-label="Investor mode"
              className="ml-2 hidden items-center gap-0 border border-line md:flex"
            >
              {(
                [
                  ["live", "LIVE SYSTEM"],
                  ["evidence", "EVIDENCE"],
                  ["economics", "ECONOMICS"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onMode(id)}
                  className={cn(
                    "h-8 px-3 font-mono text-[10px] tracking-[0.16em] transition-[color,background-color] duration-150",
                    mode === id
                      ? "bg-accent text-accent-fg"
                      : "text-muted hover:bg-elevated hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : null}

          <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-150",
                  pathname === item.to || (item.to === "/refinery" && pathname === "/")
                    ? "text-fg"
                    : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            to="/pilot"
            className="ml-auto hidden h-9 items-center border border-accent bg-accent px-3 font-mono text-[10px] tracking-[0.16em] text-accent-fg sm:ml-4 sm:inline-flex lg:ml-6"
          >
            DISCUSS A PILOT
          </Link>

          <button
            type="button"
            className="ml-auto inline-flex size-11 items-center justify-center text-fg lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {onMode ? (
          <div className="flex border-t border-line md:hidden" role="tablist" aria-label="Investor mode">
            {(
              [
                ["live", "LIVE"],
                ["evidence", "EVIDENCE"],
                ["economics", "ECONOMICS"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onMode(id)}
                className={cn(
                  "h-11 flex-1 font-mono text-[10px] tracking-[0.16em]",
                  mode === id ? "bg-elevated text-fg" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {open ? (
          <div className="border-t border-line bg-surface px-4 py-4 lg:hidden">
            <div className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center border-b border-line font-mono text-xs tracking-[0.14em] uppercase text-fg"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-faint">
            EDEN OS · VALUE-AWARE CONTROL LAYER · EVIDENCE BEFORE CLAIM
          </p>
          <p className="font-mono text-[10px] tracking-[0.12em] text-faint">
            Simulated results stay labelled. Measured results stay scoped.
          </p>
        </div>
      </footer>
    </div>
  );
}
