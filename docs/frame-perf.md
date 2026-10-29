# Frame rate of the 3D painting — work list

Goal: steadier frames. Today, in a clean Chrome on the RTX 3080 laptop: 50 fps, frame p50 16.7 ms but p90 33.3 ms
(dropped frames). Branch `feat/frame-perf`, from `47555ed` (three.js r186, WebGLRenderer).

## How every item is checked

1. `node scripts/frame-bench.cjs` — reference (A, `http://localhost:4174`, the last commit served from a copy) against
   the work (B, `http://localhost:4173`). A and B stay open side by side and take turns (12 rounds × 40 frames), because
   this laptop's clocks drift ±30 % minute to minute. Read: the median of per-round differences, and the **exact counts
   per frame** (draws, uniform uploads, texture MB, matrices recomputed, CSS reads), which don't depend on clocks.
   Noise floor measured with A = B: ±1.3 ms (4 %).
   `--profile` adds the per-phase breakdown (unminified three.js), `--live` the real loop in a visible window.
2. `node scripts/scene-diff.cjs --b http://localhost:4173` — day and night (and the event instants an item touches):
   within the noise floor (the reference against itself: ~600 px of 373K by day; night adds blinking lights, ~750 px).
   The harness clears the page's random moments and empties the painted-layer raster queue before capturing (that queue
   works within a time budget per frame, so a slow moment left layers undrawn: a missing sun, blobs, half-drawn lines).
3. `pnpm exec playwright test e2e/home.spec.js`.

## Baseline (2026-10-29, paired benchmark, day 15:00)

| Measure | Per frame |
|---|---|
| Forced frame (CPU + GPU, two pages open) | p50 30.8 ms, p90 45 ms, mean 32 ms |
| Draw calls | 467 |
| Uniform uploads | 1,694 |
| Texture uploads | 0.5 MB |
| Matrices recomputed | 1,026 |
| CSS reads (`getComputedStyle`) | 387 |

Breakdown of a frame (profile, ms, inclusive, rows overlap): three.js draw submission 9.7 (of which per-draw uniform
and program setup 6.9) · our scene update 8.4 (SVG mirror CSS reads 4.1, batch sync 2.3) · reflections 6.4 · matrix
updates 4.0 · traversal 2.3 · front / sky passes 2.3 + 1.7 · driver 5.7.

## Measure first

- [ ] M1 Your Chrome: 20–25 fps there vs 50 fps in a clean Chrome (screen scaling? extensions? the debugging extension?)
- [ ] M2 A phone (high pixel density, mobile GPU)
- [ ] M3 The Intel GPU's live loop since the last optimisations

## Quick wins

- [x] 1 **Matrices recomputed only when an object moved** — target: matrix updates (4.0 ms, 1,026 a frame; 790 objects
      auto-update, 160 moved in 3 s)
- [x] ~~2 **Batch sync only on change**~~ (tried, no gain: its cost was the scene walks item 1 removed) — target: batch sync (2.3 ms)
- [x] 3 **Seine reflection every other frame** (the basin already is) — target: reflections (6.4 ms)
- [x] ~~4 **Atlas: upload only the changed patch**~~ (measured: no full atlas upload in 6 s of the live loop; all texture uploads ~3 ms/s) — target: texture uploads (0.5 MB a frame on average), spikes
- [x] ~~5 **Spread the full CSS pass over frames**~~ (tried: +1 ms per frame, p90 worse; the per-frame bookkeeping costs more) — target: spikes (p90)

## Medium

- [ ] 6 **CSS animations through the Web Animations API** instead of `getComputedStyle` every frame — target: CSS reads
      (387 a frame, 4.1 ms)
- [x] ~~7 **Shared uniforms in one buffer** (`UniformsGroup`)~~ (three binds uniform buffers only for ShaderMaterial, the paint material is a patched Lambert; flat Float32Array uniforms instead: −0.1 ms, noise, not kept) — target: uniform uploads (1,694 a frame, 6.9 ms)
- [x] 8 **Fewer objects in the reflections** — target: reflections (6.4 ms)
- [ ] 9 **Fewer shader variants**, cheap ones only — trap measured before: one uber shader took start-up 7 s → 28 s on
      the Intel GPU

## Larger

- [ ] 10 **Merge static meshes** (extend the batching / `BatchedMesh`) — target: draws (467), driver, traversal
- [ ] 11 **Compile the painting CSS into data at build time** — target: all CSS reads
- [ ] 12 **Static reflection cached**, moving objects redrawn into it — target: reflections

## Ruled out (measured)

- WebGPU / TSL: 2.7× slower per frame on this scene (patch archived in the main checkout's `.claude/archive/`).
- Blender meshes: the frame cost doesn't depend on where the meshes come from.
- Fewer triangles: not the bottleneck.

## Results

| Item | Before → after | Counts | Pixels | Tests |
|---|---|---|---|---|
| 1 Matrices | −1.5 to −1.7 ms per frame (~5 %), B faster 8–10/12 rounds | matrices recomposed 1,098 → 193; scene walks 5 → 3 a frame | day 147 px, night 864 px (old harness, noise) | e2e 17/17 |
| 2 Batch sync | no gain, not kept | buffer uploads 0.07 → 0.04 MB | — | — |
| 3 Reflections in turn | 1 + 3: −8.7 % per frame, B faster 22/24 rounds; p90 −11 % | draws 467 → 407, uniform uploads 1,695 → 1,423 | day 6 px, night 770 px | e2e 17/17 |
| 4 Atlas uploads | not needed | full atlas never re-uploaded in the live loop | — | — |
| 5 Spread the full pass | +1 ms, p90 20.1 → 22.4 ms: not kept | — | — | — |
| 7 Shared uniforms | flat arrays: −0.1 ms (noise), not kept | — | — | — |
| 8 Small objects out of the reflections | −0.5 ms (−4.7 %), B faster 14/24 rounds; p90 14.3 → 13 ms | draws 412 → 361, uniform uploads 1,430 → 1,257 (−12 %) | day 469 px, night 1,071 px (missing glints in the water), Christmas 12 px | e2e 18/18 |
| Bug: reflection pass made hidden objects visible | the pass now restores each object's own visibility | — | — | e2e 18/18 |
| Bug: 3D moon during the fast-forward | moon off by >15 px or shown after setting: 29 → 5 frames (night → day), 7 → 2 (day → night) | sky-clock groups read every frame while `html[data-ff]` | — | e2e + new test (fails without the fix) |
