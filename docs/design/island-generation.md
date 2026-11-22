# Island generation: land first, coast emerges

**Proposed.** This is the technical companion to [the island's deep history](island-story.md). That story is the rationale for every parameter here.

## Why the old approach made strange shapes

Starter Island's coast is stored as a radius for each bearing around an ellipse (`src/worlds/starter/coastline.ts`). Growing the island meant pushing some bearings outward. That always looks inflated or squeezed, like a stress toy, because real coasts aren't drawn around a centre. They are where the sea meets land that rock, ice, rivers and waves already shaped. The first Highwood pass made the same mistake: a lobe added as a smooth maximum over northern bearings.

## The principle

**Land first, coast emerges.** Generate one height field for the whole island, then take the coastline as its sea-level contour. The coast is never an input.

## Layers of the height field

Every layer is seeded and deterministic.

1. **Base mass.** A few low-frequency "continent" shapes for the main blocks: the southern block, the Windstone upland, and the Highwood upland. A gentle falloff toward the edge of the map keeps the island surrounded by sea. No ellipse.
2. **Fractal detail.** fBm noise with lacunarity about 2. A gain of 0.5 gives a smooth coast; a coast's fractal dimension is roughly 2 minus the noise's Hurst exponent, so the fine roughness uses a gain near 0.7. It is strongest near sea level and on hard rock, so the interior stays walkable.
3. **Hard-rock uplands.** Ridged multifractal noise, weighted by an uplift field placed where the story puts granite: Windstone, Cairn Summit and Fallow Ridge. It gives sharp crests and rock bands.
4. **Domain warping.** Displace the noise coordinates with another noise field, so ridges and valleys fold and flow instead of lining up on a grid.

## Erosion turns noise into land

Erosion is what makes the land read as shaped, rather than as bumps.

- **Hydraulic.** Particle droplets or flow accumulation carve drainage networks: a creek in each valley, with side gullies feeding it. The sediment they carry drops into fans, valley flats and beaches. This produces the benches, valley floors and slope breaks the [experience goal](../backcountry.md#experience-goal) asks for.
- **Thermal.** Slopes steeper than the talus angle shed material. That leaves clean cliff bands above and scree fans below.
- **Coastal.** Wave exposure cuts headland cliffs, and sand collects in sheltered bays.

## Keeping the settled south

- **Masks.** Protected ground blends from the authored terrain into the generated terrain across a soft band, and the generator never changes it. Protected ground includes:
  - the harbor, the dock and the ferry ramp;
  - Seabrook, the farm, the roads and Fire Supplies;
  - Pinewoods, Juniper Hollow, Fernfall and Mirror Pool;
  - the Windstone launch, landing meadow and flight envelope;
  - the beach and dune shaping from #167.
- **Pinned control points.** These include the summit height, the creek's course, the harbor's depth, and Windstone staying a sea-facing headland. The generator fills in around them.
- **Compatibility.** Existing coordinates, saves, and the glider, landing and coastline tests must still hold. Only tests that pinned the old ellipse formula are rewritten.

## Bake, don't compute live

- **The generator script.** An offline, seeded script writes a heightmap asset, for example 1024 × 1024 cells at 0.5 to 1 m each. It also writes derived layers for the habitat classifier: flow accumulation or moisture, slope, and exposure.
- **One source.** `groundHeight`, the coast helpers, host physics, terrain rendering, the map, the ocean's shore-depth texture and the skiff buoy ring all read the same baked data. This retires the duplicated coast formula in `src/ocean.ts`.
- **Reviewable changes.** The parameters and a preview image are committed beside the asset, so regenerating the island shows up as a diff a person can review.
- **Budget.** Measure the asset size and load time against the [performance baseline](../backcountry.md#performance). Use a compressed format, and a coarser grid outside the playable area if needed.

## Acceptance metrics

Tested automatically where possible:

- **Coastline fractal dimension** by box counting: about 1.2 to 1.3. An ellipse is about 1.0.
- **Shoreline development index**, the coast length relative to a circle of the same area: well above 1.
- **Slope distribution:** most land is walkable, with deliberate steep bands.
- **Drainage:** every valley reaches the sea or a lake, with no stray pits.
- **Dry land:** about 0.2 km² within the agreed extent.
- **Protected sites** unchanged within tolerance.
- **Look test:** the overview reads like a real nautical chart, and the bare land holds up from the [hero views](../backcountry.md#hero-views).

## The current bake

`npm run island:generate` runs the generator in about 3 seconds. It writes `src/assets/geometry/highwood-heightmap.ts`, 2 MB of base64, and the preview `docs/images/highwood-generated.png`. Its parameters are in `src/worlds/starter/layout/island-generation.ts`, and the code is in `src/worlds/starter/generation/`.

- **Join.** Across the old north-west shore, the higher of the authored and generated ground wins. Highwood's land meets the old island, and its sea never drowns old land.
- **Erosion.** Droplets stop at the sea and never cut below 0.5 m above the datum, so coves come from the land's shape rather than from rills.
- **Measured.**
  - About 0.18 km² of land in the generated grid, roughly 0.2 km² for the whole island.
  - A shoreline development index of 2.3.
  - Under a quarter of the land is steep.
  - Cairn Summit, at 49.8 m, is the highest point.
- **Still to tune.** The coastline's box-counting dimension is 1.07, below the 1.2–1.3 target, because erosion and the beach pass smooth the finest coves. The Art Director's review of the bare land from the hero views comes next.

## Workbench study

- Compare seeds and parameters from above, with map view, hillshade, contours and a coast overlay.
- Walk the bare terrain on the ground.
- The Art Director reviews the bare land from the hero views before any trees go on it. If the bare land isn't compelling, trees won't save it.
