# Island generation: land first, coast emerges

**Proposed. Last tended 2026-11-23.** This is the technical companion to [the island's deep history](island-story.md). That story is the rationale for every parameter here.

## Why the old approach made strange shapes

Starter Island's coast is stored as a radius for each bearing around an ellipse (`src/worlds/starter/coastline.ts`). Growing the island meant pushing some bearings outward. That always looks inflated or squeezed, like a stress toy, because real coasts aren't drawn around a centre. They are where the sea meets land that rock, ice, rivers and waves already shaped. The first Highwood pass made the same mistake: a lobe added as a smooth maximum over northern bearings.

## The principle

**Land first, coast emerges.** Generate one height field for the whole island, then take the coastline as its sea-level contour. The coast is never an input.

## Layers of the height field

Every layer is seeded and deterministic.

1. **Base mass.** A few low-frequency "continent" shapes for the main blocks: the southern block, the Windstone upland, and the Highwood upland. A gentle falloff toward the edge of the map keeps the island surrounded by sea. No ellipse.
2. **Fractal detail.** fBm noise with lacunarity 2. The coastline of an fBm surface with Hurst exponent H has a fractal dimension of about 2 − H, and an octave gain of 2^(−H) sets H (`mandelbrot-1967`, `mandelbrot-1975`, `voss-1988`; recorded unopened, so unsourced). A gain of 0.5 gives H = 1 and a smooth coast near 1; the 1.2–1.3 of real rocky coasts needs a gain of about 0.57–0.62. Highwood's fine roughness uses 0.6, strongest near sea level and on hard rock so the interior stays walkable. The relation assumes a homogeneous field; here the coast is the contour of a broad dome plus noise, so the finest scales still read near 1.
3. **Hard-rock uplands.** Ridged multifractal noise, weighted by an uplift field placed where the story puts granite: Windstone, Cairn Summit and Fallow Ridge. It gives sharp crests and rock bands. Pinned crags and ridges (`pins`, `ridges`) shape the landmarks the story needs; they stand on the land with `max`, after the noise.
4. **Domain warping.** Displace the noise coordinates with another noise field, so ridges and valleys fold and flow instead of lining up on a grid.

## Erosion turns noise into land

Erosion is what makes the land read as shaped, rather than as bumps.

- **Hydraulic.** Simulated raindrops (Beyer's droplet model, `beyer-2015`, unopened) carve the drainage. Each drop speeds up downhill, up to a cap, and picks up sediment where it can carry more. It sets the load down where it slows, as a fan when it dries out, and partly as a delta where it meets the sea. Sediment never builds on the seabed, and cutting stops above the waterline, so coves keep the shape the land gave them. The two glacial valleys are carved deep enough (13–16 m) to gather the drainage.
- **Thermal.** Slopes steeper than the rock can hold shed material downhill. Soft ground rests near a 35° scree slope (`selby-1993`, unopened; unsourced). Granite holds far steeper, and it weathers in layers 6 m thick, so hard ground breaks into benches and rock bands.
- **Coastal.** Each coastal cell measures the share of directions that run to open sea, starting past its own distance from the shore. Wave energy gathers on headlands and spreads in bays, so a cell that stands out from the shore around it, sits on granite or is steep keeps bare rock. Sand settles only at sheltered bay heads, above the water. This sorts the surface layer; it does not yet cut cliffs into the height field.

## Keeping the settled south

- **Masks.** Protected ground blends from the authored terrain into the generated terrain across a soft band, and the generator never changes it. Protected ground includes:
  - the harbor, the dock and the ferry ramp;
  - Seabrook, the farm, the roads and Fire Supplies;
  - Pinewoods, Juniper Hollow, Fernfall and Mirror Pool;
  - the Windstone launch, landing meadow and flight envelope;
  - the beach and dune shaping from #167.
- **Pinned control points.** These include the summit height, the creek's course, the harbor's depth, and Windstone staying a sea-facing headland. The generator fills in around them. Cairn Summit is a mountain massif, not a lone cone. Its pin is an 80 m crag, steep toward the north-east sea (a 24 m face radius) and 36 m across, standing on a granite ridge that runs north-west toward Fallow Ridge.
  - **The ridge** is a crest through four points, falling from 68 m by the crown to 32 m. Each point sets how far its flanks reach on either side. The south-west flank is 70 m by the crown, clear of the village's protected ground, and broadens to 150–160 m further along. That gives an even face of about a third, which the summit road switches back up. The north-east flank stays steep.
  - **Why so tall.** At 50 m, Cairn read as a hill behind the village's trees. At 80 m it reads as the island's mountain from home, and its broad flank gives room for a drivable road. The design comparison of a 52 m north-west ridge, a 52 m west ridge and this massif is in [decisions](decisions.md).
  - **Erosion** leaves 0.2 of the crown and 0.4 of the ridge alone, so the flanks keep gullies without losing their even face.
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

`npm run island:generate` runs the generator in about 3 seconds. It writes `src/assets/geometry/highwood-heightmap.ts`, 454 KB of base64 under the repository's 500 KB file limit, and the preview `docs/images/highwood-generated.png`. Its parameters are in `src/worlds/starter/layout/island-generation.ts`, and the code is in `src/worlds/starter/generation/`. The asset stores heights every 2 m and layers every 4 m; the generator works at 1 m.

- **Join.** The bake owns the join: across the old north-west shore, the higher of the authored and generated ground wins, so Highwood's land meets the old island and its sea never drowns old land. At runtime the baked height is the ground beyond protected land, and the exact authored ground takes over only in the last tenth of the join's fade, so the two meet without a step. The land's likelihood fades out well inside the join sector, so its coast is drawn by the noise rather than the sector's edge.
- **Stale bakes.** The asset records a hash of every file it depends on (`bake-sources.ts`): the generator, its parameters and the authored terrain. A test fails until the island is baked again.
- **Shoreline.** `coastPoint(angle)` stays a radius per bearing for bounds and the skiff buoys. On Highwood it gives the farthest shore along the ray, with bays and straits inside it. The real shoreline is traced once at load by marching squares over the ground (`src/shoreline.ts`, about 40 ms), and the surf and the map follow it.
- **Measured.**
  - About 0.16 km² of land in the generated grid, roughly 0.2 km² for the whole island.
  - A shoreline development index of 2.2. A box-counting dimension of 1.09, fitted over the noise's scaling range of 8–64 m.
  - Under a fifth of the land is steep.
  - Cairn Summit's crown, at about 80 m at (−92, 219), is the highest point; Fallow Ridge still hides Pine Draw's ground, but not its smoke, from the tower deck.
- **Stone.** Upland stone renders as granite above about 7–15 m, blending from the coastal sandstone below. It is projected from three sides, so steep faces aren't streaked.
- **Aspect.** Slopes facing south, toward the midday sun, are tinted drier and straw-coloured; slopes facing north stay cooler and mossier. In the northern hemisphere, south-facing slopes get more direct sun, so they are warmer and drier (unsourced). The tint is a hue shift, so hillsides differ at every hour without baking in a light direction that would disagree with the evening sun.
- **Still to tune.** The coast dimension is below the 1.2–1.3 target: the dome-plus-noise shape reads near 1 at fine scales. Gully density is still even on most slopes, and the old island's smooth hills sit beside the eroded land in a different style.

## Workbench study

- Compare seeds and parameters from above, with map view, hillshade, contours and a coast overlay.
- Walk the bare terrain on the ground.
- The Art Director reviews the bare land from the hero views before any trees go on it. If the bare land isn't compelling, trees won't save it.
