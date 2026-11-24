# Iteration tooling

Three tools let a designer or an agent see, measure and reproduce landscape, ecology, model and simulation work without driving a browser by hand:

- **Captures** render named camera presets headlessly to PNG with a JSON sidecar, in colour, greyscale and silhouette. They also make turntable sheets for Workbench specimens and before/after sheets with a difference heatmap.
- **Debug overlays** draw terrain slope, habitat, colliders, corridors, protected areas, wildfire state, Fire Watch sightlines and animal intents over the island, in the game, the Workbench and captures.
- **Sim sweeps** fast-forward the host game across many seeds without rendering and write JSON Lines events, a summary of distributions and a replayable recording.

Captures and sims write to `captures/` and `sims/`, which git ignores. Agents can follow the [capture and compare skill](../.agents/skills/capture-and-compare/SKILL.md) and the [sim sweep skill](../.agents/skills/sim-sweeps/SKILL.md).

## Captures

```sh
npm run capture
```

With no arguments the command renders every preset in all three modes. It starts its own Vite host on a free port in playtest mode, so it neither needs nor disturbs a running `npm run dev`, and opens each view in headless Chromium.

| Flag | Effect |
| --- | --- |
| `--preset all` or `--preset a,b` | Presets to render. See the table below. |
| `--mode all` or `--mode color,greyscale,silhouette` | Render modes. Greyscale checks values. Silhouette paints the sky white and everything else black to check shapes and skylines. |
| `--hour H`, `--weather clear\|mist\|overcast\|rain` | Override the preset's island hour and sky. Weather is a fixed rain level from [`captureWeather`](../src/assets/recipes/capture-presets.ts). |
| `--seed N` | For landscape presets, the ambient clock in seconds, which fixes wildlife, water and effect phases. For specimens, the first growth seed. |
| `--overlay slope,wildfire,…` | Debug overlays to draw. Some presets choose their own. |
| `--grid` | Specimens only: each of the preset's seeds at eight angles, plus one turntable contact sheet per mode. |
| `--revision <git-ref>` | Render a commit from a detached worktree in `captures/.revisions/` into `captures/rev-<sha>/`. |
| `--compare A,B` | Before/after sheets. Each side is a capture folder (such as `captures` or `captures/rev-1a2b3c4`) or a git ref, which is captured first. |

Each capture writes `captures/<preset>/<preset>-<mode>.png` and a JSON sidecar beside it:

```json
{
  "label": "Fire Watch deck looking north at dawn",
  "camera": { "target": [21, 4.1, 76], "alpha": -1.62, "beta": 1.44, "radius": 40.2, "fov": 0.9 },
  "hour": 6.3, "weather": "mist", "rain": 0.12, "seed": 0, "overlays": [],
  "preset": "tower-dawn-north", "mode": "color", "commit": "7a838c0",
  "url": "/workbench.html?view=1&…#landscape",
  "perf": { "fps": 58, "frameMs": 9.4, "drawCalls": 644, "meshes": 378, "triangles": 452777 }
}
```

`captures/index.html` shows the newest capture of every preset and mode with its perf numbers. Open it from disk. Chromium renders on the GPU through Metal, about 5 s per capture including the settle wait. Set `CAPTURE_SOFTWARE_GL=1` on a machine without a usable GPU; that is roughly 30 times slower. Compare perf numbers between captures from the same machine, not with a player's computer. `CAPTURE_BROWSER` points at another Chromium executable when Playwright's own browser is not installed.

### Presets

Presets are declarative data in [`src/assets/recipes/capture-presets.ts`](../src/assets/recipes/capture-presets.ts). A landscape preset gives an **eye** and a **look** point in map metres with heights above the ground, which reads more easily than orbit angles. A specimen preset names a Workbench subject, a camera and its options.

| Preset | View |
| --- | --- |
| `tower-dawn-north` | From the Fire Watch deck north over the meadow at dawn, in mist. |
| `forest-edge-threshold` | From the open meadow into the Pinewoods edge. |
| `fernfall-crossing` | The Fernfall crossing below the falls, under a light overcast. |
| `pale-grove-evening` | Into the Juniper grove trunks at evening. |
| `ridge-to-harbor` | From the Windstone survey scope back to the harbor. |
| `fire-watch-overview` | High view of the tower and fire sites with sightline, wildfire and protected-area overlays. |
| `highwood-tower-north` | From Cairn Summit north over Highwood at dawn, in mist. |
| `highwood-fire-road` | Along the fire road into the Highwood forest at midday. |
| `highwood-creek-ford` | Alder Creek under an overcast sky after rain. |
| `highwood-birch-flats` | Birch Flats in low evening sun. |
| `highwood-summit-home` | From Cairn Summit, beside the Fire Watch's site, south to the settled south in late afternoon. |
| `highwood-cairn-southwest` | Cairn Summit from the south-west shore, a landmark check of the crag's outline rather than a hero view. |
| `ground-cairn-summit` | From 8 m above Cairn Summit's crown down its rocky south-east flank, a ground-texture check for tiling from the overlook. |
| `ground-cairn-slope` | Standing on bare granite on Cairn's south-east flank at walking height, a close ground-texture check. |
| `ground-cairn-northeast` | Up Cairn Summit's steep north-east face from the ridge foot, through pines: granite crags, clitter and the rock-to-turf edge at walking height. |
| `ground-cairn-tor` | A few metres from a four-block granite tor on Cairn's western flank at walking height, a close check of the outcrop and clitter shapes. |
| `specimen-tussock` | A grass tussock specimen. Use `--grid` for a four-seed turntable. |

The `highwood-*` presets are the [Highwood hero views](backcountry.md#hero-views), plus the Cairn landmark check. Playtest events' **Go to** lists them too, so a tester can stand at each eye. The `ground-cairn-*` presets check Highwood's ground textures and granite rocks on Cairn Summit; they are not hero views, so **Go to** leaves them out. The older landscape presets were the current island's nearest equivalents before Highwood existed. Move a preset's eye and look points rather than adding near-duplicates.

### Compare two revisions

```sh
npm run capture -- --compare main,HEAD --preset ridge-to-harbor,tower-dawn-north
```

Each side is captured if it is not already a folder. Both revisions render the presets and camera from the current checkout, so the sheet shows what the code changed for the same view. To compare a preset change, capture both versions into folders and compare the folders. Revision captures leave detached worktrees in `captures/.revisions/`; remove that folder and run `git worktree prune` to clean up. Revisions older than this tooling have no perf readout or render modes, so their sidecars record `perf: null`. The command writes `captures/compare/<before>-vs-<after>/<preset>-<mode>.png`: before, after and a heatmap in which changed pixels glow red over a dimmed copy of the after image. `compare.json` lists the share of pixels that changed by more than 24 of 255 and the mean difference for each sheet.

## The dev view URL

The game and the Workbench read a dev-only query when served by `npm run dev` or `npm run playtest`. A production build does not read it.

| Parameter | Effect |
| --- | --- |
| `dev=1` | Required. Without it the other parameters are ignored. |
| `devcam=x,y,z,alpha,beta,radius,fov` | Fixed orbit camera around a target, in metres and radians. You can still drag to orbit. |
| `devsky=hour,rain` | Fixed island hour (0–24) and rain (0–1) for rendering. Host time keeps running. |
| `overlay=slope,wildfire` | Overlays to show at load. |
| `perf=1` | Frame readout: FPS, frame time, draw calls, active meshes and triangles. `.perf-readout` carries `data-fps`, `data-frame-ms`, `data-draw-calls`, `data-meshes` and `data-triangles`. |
| `capture=1` | Hide the HUD and the overlay picker. |
| `mode=greyscale\|silhouette` | Review render mode. |

For example, to watch the fire-watch checkpoint from above with its fire state:

```sh
MISSION_ISLAND_CHECKPOINT=fire-watch MISSION_ISLAND_CREW_SIZE=1 npm run playtest
```

Then open `http://localhost:5194/?dev=1&devcam=0,0,36,-1.2,0.7,70,0.9&overlay=wildfire,sightlines&perf=1`. A malformed request fails loudly. The page stops with the reason in `document.body.dataset.devViewError`, so a capture never renders the wrong view.

In the Workbench, add the same parameters before the `#`, for example `workbench.html?dev=1&overlay=slope&perf=1#landscape`. The page exposes `window.missionDev` with the overlay controller and the Babylon scene for scripted checks.

## Debug overlays

With `dev=1`, a **Debug overlays** panel lists every layer. Hover a name for its legend.

| ID | Shows |
| --- | --- |
| `slope` | Ground slope per 3 m cell, green (flat) to red (over 50°). |
| `habitat` | Juniper Hollow patches coloured by kind, inside the habitat boundary. |
| `highwood-habitat` | Highwood's dominant habitat per 4 m cell, from [the habitat classifier](backcountry.md#habitats): dark green pinewood, light green edges, purple heath, grey ridge, blue wet woodland, orange bracken, white birch, yellow shore. |
| `solids` | Walking solids (blue) and cargo-only ferry colliders (pink). |
| `corridors` | Road shoulders, footpath edges and centrelines. |
| `protected` | Windstone launch clearance, landing approach and circle, and the walk back. |
| `wildfire` | Unburnt hotspots in orange, burning ones orange to red by heat, burnt-out ones in grey, the `windAt` vector, and in violet the hotspot the wind favours next. Without a fire, each site shows the current wind. |
| `sightlines` | Terrain line of sight from the Fire Watch deck to each fire site: green when visible, red when hidden. This is a design preview: in play, the fire finder locates any fire regardless of terrain. |
| `animals` | Hares and foxes coloured by intent, with heading and recent path. |

The violet marker shows the best score from [`spreadCandidates`](../src/wildfire.ts) without the host's seeded jitter, so a close call can still go to another hotspot.

### Add a layer

A layer is data plus a sampler. Put colours and sizes in [`src/assets/recipes/debug-overlays.ts`](../src/assets/recipes/debug-overlays.ts) and register the layer in [`src/debug-overlays/catalog.ts`](../src/debug-overlays/catalog.ts). It then appears in the game, the Workbench, the `overlay=` parameter and `npm run capture -- --overlay`.

A scalar field, such as moisture, flow accumulation or exposure from a baked terrain, needs only `fieldLayer`:

```ts
export const moistureLayer = fieldLayer({
  id: 'moisture',
  label: 'Soil moisture',
  description: 'Baked moisture, dry tan to wet blue.',
  bounds: coastBounds(),
  cellM: 3,
  sample: (point) => bakedTerrain.moisture(point),
  ramp: moistureOverlay.ramp,
})
```

Other layers return lines, rings and cells from `create()`. Set `live: true` when the layer reads the host snapshot. Live layers resample four times a second, and static layers build once.

## Sim sweeps

```sh
npm run sim -- --scenario fire-watch --days 1 --seeds 1..100 --crew idle
```

The runner starts the host game from a live checkpoint with one seat, a virtual clock and seeded randomness, then steps it at the normal 30 ticks per island second without sockets or rendering. Seeds run in worker threads, one per core less one, or `--workers N`. On a 10-core laptop one island day takes about 15 s per worker, roughly 30 times real speed, so 100 seeds of one day finish in about 3 minutes. Cargo physics (cannon-es contacts) dominates that time.

| Flag | Effect |
| --- | --- |
| `--scenario` | A checkpoint ID from the [scenario table](../CONTRIBUTING.md#run-a-live-playtest-scenario). |
| `--days N` | Island days to run (a day is 480 s). Fractions work. |
| `--seeds 1..100` or `--seeds 1,4,9` | Seeds. Each seeds the host's randomness and the island-event seed, and re-lights a checkpoint's opening fire at the same site and size so its heat and spread vary. The re-lit fire starts unlocated with one hotspot burning. Juniper wildlife, the driftwood school and the weather do not follow the run seed, so their rows match across seeds. |
| `--crew idle\|scripted` | `idle` stands at the checkpoint spawn. `scripted` walks straight at the nearest burning hotspot and sprays when it arrives. It ignores terrain and paths, so treat it as a fast responder rather than a player. |
| `--out dir` | Output folder. Defaults to `sims/<scenario>/`. |
| `--replay file` | Replay a recording and check that every run reproduces its events. |

It writes three files:

- `events.jsonl`, one event per line, in seed order. Every row has `seed`, `tick`, `day`, `hour` and `type`. Types are `fire-started`, `fire-spread`, `fire-located`, `fire-out`, `fire-burned-out`, `fire-rained-out`, `regrowth` (with a stage of `ash`, `shoots` or `established`), `animal` (a hare or fox changing behaviour) and `weather` (a change between `dry`, `shower` and `dousing`, the level that douses hotspots and stops spread).
- `summary.json` with the run settings, the commit, wall time, per-seed totals and their distribution across seeds (count, min, p10, median, mean, p90, max), pooled per-fire timings (`hoursToLocate`, `hoursToFirstSpread` while heat builds, `hoursBetweenSpreads` on the fixed spread countdown, and `fireHours` for fires that ended; `burningAtEnd` counts fires still alight when the run stopped), and a digest of each seed's events.
- `recording.json` with each run's settings, the crew inputs it sent by tick, and its event digest.

```sh
npm run sim -- --replay sims/fire-watch/recording.json
```

A one-day idle sweep only shows how fast an unattended fire spreads: a fire burns out after 1.5 days and an idle crew never finds it. For outcomes, run at least three days, or use `--crew scripted`.

A replay feeds the recorded inputs back at the same ticks and exits nonzero if any seed's events differ. Use it after a refactor that should not change behaviour, and record again when the change is intended.
