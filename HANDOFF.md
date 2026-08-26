# EDEN OS / EDEN Refinery V2 — project handoff

This is the source of the live Grok deployment. It is not a clone and not a rebuild.

| Field | Value |
|---|---|
| Product | EDEN OS — value-aware control layer for computation |
| Source project | `01a03327-e789-71d2-87ff-e44d7945f788` |
| Live Grok app | https://edenrefineryv2.grok.me/ |
| Intended public origin | https://edenrefinery.com |
| WWW | https://www.edenrefinery.com |
| Auth | **OFF** — no accounts, no `DATABASE_URL` |
| Database | **OFF** — client `localStorage` / zustand only |
| Package manager | npm |
| Node | 22.x |
| Framework | TanStack Start (React 19) + Vite 8 + Nitro `vercel` preset |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Tests | `npm test` |

Do **not** rebuild EDEN from a prompt. Do **not** CNAME `edenrefinery.com` to `edenrefineryv2.grok.me` unless Grok Publish explicitly issues that record. Do **not** point GoDaddy at Cloudflare IPs for `*.grok.me`.

---

## 1. What this product is

Thesis (first five seconds): **EDEN is a value-aware control layer for computation.**

Subhead: **Turn raw compute, data and bandwidth into verified useful value.**

Pipeline (implemented as a labelled demonstration, not a hidden cluster):

SENSE → DECOMPOSE → MEASURE → KEEP/VOID → REGENERATE → NAVIGATE → VSURF → TRANSMIT → RECOMPOSE → VERIFY

Investor chrome on Refinery: **LIVE SYSTEM · EVIDENCE · ECONOMICS**.

Evidence classes are first-class UI. Modelled must never be presented as measured. Simulated must never be presented as measured.

---

## 2. Surfaces (do not drop any)

| Path | Surface | Notes |
|---|---|---|
| `/` | Home / control plane | Thesis, modules, markets, CTAs |
| `/refinery` | Refinery | Live workload demo, proof cards, pipeline |
| `/aura` | AURA FIELD | Tabs **must** remain `DIAL · HUNT · AURA · EDGE · MORE` |
| `/aok` | AOK | Attested Operational Kernel — CLEARED / HOLD / DENIED |
| `/shadow` | Shadow | Non-executing observation path |
| `/marbles` | Marbles | Provenance ledger (`localStorage`) |
| `/evidence` | Evidence | Claim table with labels and methods |
| `/pilot` | Pilot | Discuss-a-pilot intake |

AURA truth model (non-negotiable):

- Orbital geometry is **MODELLED** (SGP4 / TLE).
- Doppler / FSPL are **MODELLED**.
- Physical RF is **NOT MEASURED**.
- Catalog presence ≠ communications.
- Geometric lock ≠ RF lock.
- Loopback lock ≠ RF lock.
- PLAY offsets must not mutate ephemeris.

AOK policy: `aok-v1.0.2 / clearance-r1`. ChronoNav / Refinery policy string: `chrononav-v2.0.4 / refinery-r1`.

---

## 3. Source map

```
src/routes/            file routes (TanStack Start)
src/components/eden/   investor / engineering consoles
src/components/aura/   AURA FIELD (R3F globe + 2D fallback)
src/lib/eden.ts        pipeline, proof cards, evidence rows, modules
src/lib/aok.ts         clearance kernel
src/lib/aura/          TLE, SGP4, catalog, store, tests
src/lib/marble-store.ts
src/lib/site.ts        canonical origin (VITE_SITE_URL → edenrefinery.com)
src/styles.css         Tailwind v4 + EDEN tokens
public/og.jpg          custom share card
public/favicon.svg
vercel.json            www → apex 301
.grok/app-env.json     VITE_AUTH_ENABLED=false
```

Entry contracts required by this tree:

- `src/router.tsx` exports **`getRouter()`**
- `src/routes/__root.tsx` keeps `<AuthProvider>` and `<PreviewHostBridge />`
- `vite.config.ts` keeps `nitro({ preset: "vercel", serverDir: "./server" })` gated to build/preview, plus `grokPwaPlugin()`

---

## 4. How to run the same source

```bash
npm install
npm run dev          # local preview (Grok sandbox uses this)
npm run typecheck
npm test
npm run build        # Nitro writes .vercel/output
```

`npm run build` already targets Vercel. `db:migrate` no-ops without `DATABASE_URL` (correct: auth/db are off).

---

## 5. Import into YOUR Vercel account (optional self-host)

This does **not** replace https://edenrefineryv2.grok.me/ unless you choose to cut over later.

1. Create a GitHub repo from this archive (GitHub is not connected in this Grok Build, so import the tarball yourself).
2. Vercel → Add New Project → import that repo.
3. Project settings:

| Setting | Value |
|---|---|
| Framework preset | Other |
| Build command | `npm run build` |
| Install command | `npm install` |
| Output directory | leave empty (Nitro emits `.vercel/output`) |
| Node.js | 22.x |

4. Environment variables (Production **and** Preview):

```
VITE_AUTH_ENABLED=false
VITE_SITE_URL=https://edenrefinery.com
```

Do **not** set `DATABASE_URL`, `BETTER_AUTH_SECRET`, or `BETTER_AUTH_URL`.

5. First deploy. Confirm the `*.vercel.app` URL renders EDEN (home + `/aura` + `/aok`).
6. Vercel → Settings → Domains → Add `edenrefinery.com` and `www.edenrefinery.com`.
7. Use **only** the DNS records Vercel then displays. Put those in GoDaddy. Vercel provisions TLS after they verify.

`vercel.json` already 301s `www.edenrefinery.com` → `https://edenrefinery.com/:path*`.

---

## 6. Keep the domain on Grok instead (no move)

If the canonical live app must stay on Grok:

1. Open **this** Build (project `01a03327-e789-71d2-87ff-e44d7945f788`).
2. **Publish** — slug `edenrefineryv2` — leave access public/link.
3. **Connect domain** → `edenrefinery.com` (and `www` if offered).
4. Copy the records Grok prints. Those are the only GoDaddy values that will get HTTPS for this hostname on Grok’s edge.

Grok Build does support custom domains on a **published** app. The agent inside the sandbox cannot register the hostname; Publish has to.

---

## 7. Grok-specific pieces (leave them in)

Required for this source to build as-is:

| Path | Why |
|---|---|
| `scripts/with-app-env.mjs` | Injects `VITE_AUTH_ENABLED` into Vite |
| `scripts/grok-pwa-plugin.mjs` + `server/middleware/grok-pwa.ts` | PWA / install / OG injector |
| `scripts/app-env-plugin.mjs` | `/__app-env` in dev |
| `public/__grok/` | Platform chrome assets |
| `src/components/preview-host-bridge.tsx` | Preview host bridge (noop outside Grok) |
| `.grok/app-env.json` | Auth-off flag |

Removing them without rewriting `vite.config.ts` will break the production build.

`satellite.js` is pinned to **5.0.0** (v7 WASM/pthread broke the production IIFE). Do not upgrade it casually.

---

## 8. Environment (placeholders only)

See `.env.example`. Never commit secrets. This app currently needs none.

---

## 9. Verification snapshot (this workspace)

| Check | Result |
|---|---|
| SOURCE PROJECT | `01a03327-e789-71d2-87ff-e44d7945f788` |
| LIVE APP | https://edenrefineryv2.grok.me/ |
| SOURCE VERIFIED | YES — Refinery, AURA, AOK, Shadow, Marbles, Evidence, Pilot |
| FRAMEWORK | TanStack Start + Vite + Nitro (`vercel` preset) |
| PACKAGE MANAGER | npm |
| BUILD COMMAND | `npm run build` |
| TARGET DOMAIN | https://edenrefinery.com |

GitHub push from this Build: **not available**. Use the downloadable archive.

---

## 10. What “done” looks like for the domain

- https://edenrefinery.com serves this EDEN UI (not GoDaddy parking).
- HTTPS is valid for the apex (and www, which 301s to apex if on Vercel).
- https://edenrefineryv2.grok.me/ remains live unless you deliberately unpublish it.
