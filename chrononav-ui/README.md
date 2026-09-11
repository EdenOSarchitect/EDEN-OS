# CHRONONAV Stellar Dashboard

A standalone front-end prototype for the EDEN OS CHRONONAV stellar-system and signal explorer.

## Run

Open `index.html` in a modern browser. No build step is required for this first prototype.

## Current scope

- Milky Way visualisation with selectable star markers
- Stellar systems index with catalogue-derived demo values
- Sun-at-observer signal calculation using inverse-square scaling
- Approximate photopic illuminance conversion
- Apparent-magnitude calculation
- Observer-view simulation
- Example EDEN Marble v2-style evidence payload
- Explicit MODELLED / CATALOGUED presentation boundary

## Next implementation gates

1. Replace demo catalogue data with an actual astronomical catalogue ingestion layer.
2. Add proper coordinate transforms and observer position/time.
3. Add spectral/photometric models rather than a single aggregate watts-to-lumens factor.
4. Add binary/multiple-system representation and orbital propagation.
5. Bind every derived result to a versioned Marble with canonical inputs, model version, provenance and hashes.
6. Add API-backed search and tiled sky/galaxy visualisation.

This prototype does not claim that catalogue-derived values are sensor measurements.
