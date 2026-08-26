# Eden Refinery V2 — Live Source Export Staging

This branch stages the export of the currently published Eden Refinery V2 client application into GitHub.

## Live identity

- Public canonical app: https://edenrefinery.com/
- Grok source/deployment origin: https://edenrefineryv2.grok.me/
- Grok project: `01a03327-e789-71d2-87ff-e44d7945f788`
- Runtime: client-only
- Auth: off
- `DATABASE_URL`: not present

The Grok-hosted application redirects to / is presented through the canonical `edenrefinery.com` domain. Treat these as the same deployed application identity, with Grok as the project/source origin and `edenrefinery.com` as the public domain.

## Published source surface

- Source page: https://edenrefineryv2.grok.me/source
- Handoff: https://edenrefineryv2.grok.me/HANDOFF.md
- Source archive: https://edenrefineryv2.grok.me/eden-refinery-v2-source.tar.gz
- PWA manifest: https://edenrefineryv2.grok.me/__grok/manifest.webmanifest

## API status at export time

The live app does not expose a REST workload/source API. The following paths were reported as 404 at export time:

- `/api`
- `/api/source`
- `/api/health`
- `/api/marbles`
- `/api/refinery`
- `/api/aok`
- `/neural`
- `/robots.txt`
- `/sitemap.xml`

Refinery / AOK / Marbles execute in the browser.

## Export state

The repository branch `eden-refinery-v2-import` is reserved for importing the exact published source archive. The archive itself has not yet been committed from this ChatGPT environment because the Grok host is not currently retrievable here. No source files should be inferred or recreated from the UI; the exact published archive should be imported verbatim when retrievable.
