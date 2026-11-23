# Highwood backcountry

**In progress. Last tended 2026-11-23.** Highwood is the wild country north of Starter Island's settled south: forest, meadow, ridge and creek, with a fire access road and the Fire Watch on Cairn Summit. It is where the crew watches for smoke and drives out to fight it. The land comes from [the island's deep history](design/island-story.md), and it is generated as described in [island generation](design/island-generation.md).

## Experience goal

> The terrain and basic trees have been very simplistic and blob like. This was mainly due to working out the overall game mechanics. But, after this work, I really hope players would feel a sense of awe and inspiration when looking at our game art, trees, and terrain to get a sense of immersion and connection with the wilderness.
>
> — the project owner

Looking over Highwood should make players feel awe, curiosity and connection with wild country, and want to stop, look and remember the place. Every phase is judged against this goal, as well as correctness and performance.

### Hero views

Capture these at every phase with the same camera, hour, weather and quality. They are also the Art Director's review set and the PR screenshots.

| View | Light | Feeling |
| --- | --- | --- |
| Tower deck looking north | Dawn, mist in the draws | Vastness: layered, fading ridges |
| Fire road entering the forest | Midday, light filtering down | The threshold from open meadow into tall trunks |
| Alder Creek ford | Overcast after rain | Intimacy: wet stones, moss, alder roots |
| Birch Flats | Evening, low sun | Beauty: pale trunks glowing amber, long shadows |
| Ridge crest looking back south | Late afternoon | Belonging: Harbor, Seabrook and the farm small in the distance |

The five views are `highwood-*` capture presets in [`src/assets/recipes/capture-presets.ts`](../src/assets/recipes/capture-presets.ts), each an eye, a look point, an hour and a sky. A test keeps every view's line of sight clear of terrain and within the Workbench's orbit range.

A sixth preset, `highwood-cairn-southwest`, looks at Cairn Summit's crown from the south-west shore at 15:00 in clear weather. It is a landmark check for Cairn's outline, not a hero view, so it isn't held to the experience goal's feelings. **Go to** lists it with the hero views.

Capture the views with the shared [iteration tooling](iteration-tooling.md#captures):

```sh
npm run capture -- --preset highwood-tower-north,highwood-fire-road,highwood-creek-ford,highwood-birch-flats,highwood-ridge-home
```

Add `highwood-cairn-southwest` to the list for the landmark check.

The command starts its own host, so no game needs to be running. It writes colour, greyscale and silhouette images for the silhouette test, and `--compare` makes before-and-after sheets between two revisions. [Iteration tooling](iteration-tooling.md) lists every flag.

To stand at a hero view's spot in a live playtest, press **O**, then use **Playtest events → Go to**. It lists the hero views, the Fire Watch deck and Highwood's named places.

### What makes it work

1. **Land shaped with a reason.** Drainage comes first: the creek carves the valleys, side gullies feed it, and slopes steepen toward the water and flatten into benches where the meadows sit. Rock bands run along the ridge crest and summit, with scree fans below and boulders seated in the soil. Bench edges and terraces have sharp breaks in slope. Ridge silhouettes read clearly from the tower: a notch, a lone crest pine, a rocky tooth.
2. **Trees with character, forests as masses.**
   - Each species has its own gesture:
     - sheltered, upright, orange-barked pine;
     - exposed, flat-crowned pine leaning away from the wind;
     - pale, slender birch in clumps;
     - rowan with berries at the edges;
     - low, dark alder along the water.
   - Age structure: a few old giants, mature trees, saplings in the gaps, and snags.
   - Named landmark trees, such as the lone pine in Bracken Meadow and the split birch at the ford.
   - Forests read as shapes with sky gaps from afar. They are denser in the draws, thin toward the ridge, and step down through shrubs into meadow.
   - Wind sway varies by species and exposure.
3. **Light and atmosphere.**
   - Colour layers with distance: saturated near ground, cooler middle distance, flat pale far ridges.
   - Dawn mist pools in the draws, hiding and revealing smoke. Long, warm evening light comes through the trunks.
   - Overcast weather makes the forest close and moody. Rain darkens bark and brightens moss, and haze hangs after fires.
   - From the tower, the sky is part of the composition.
4. **Ground that rewards slowing down.**
   - Needle litter under pines, moss on north faces and rocks, bracken at forest edges, heather and bilberry on dry shoulders, rushes in the wet meadow, gravel and ruts on the fire road.
   - Transitions run over metres, following moisture and shade, with no hard lines.
   - Game trails follow contours, the fire road is direct and worn, and footpaths fade where people spread out.
5. **Sound and stillness.** Building on the island sound from #191:
   - pine wind sounds different from birch wind;
   - the creek grows louder as you approach;
   - birds sing at the forest edges;
   - the tower deck is quieter and windy;
   - some places stay nearly silent, for contrast.
6. **Discovery and connection.**
   - Small finds: a cairn, a burned stump from a past fire, an animal trail, a gap with a view down to the harbor.
   - Wayfinding by landmarks and ridge lines, with the map closed.
   - Burn scars with standing snags are part of the land's story, and their visible recovery shows that the land remembers.

### Acceptance checks

These apply at every phase, beyond the technical tests.

- **Stop test.** Does a playtester pause, turn the camera, or take a screenshot?
- **Landmark test.** With the map closed, can they say where they are and how to get back?
- **Silhouette test.** Do the hero views read clearly as greyscale thumbnails?
- **Memory test.** Which place do players mention unprompted after the session?
- **Comparison test.** Is each hero view clearly better than the previous phase's capture?

## Phases

| Phase | Work |
| --- | --- |
| 0 | Branch, baseline and hero-view captures at their nearest current equivalents. **Not done as planned:** no baseline captures were made before the land changed. In the Art Director's reviews, the hero views passed the silhouette test in 1 of 5 in round 1, and 2 passed, 2 partly passed and 1 failed in round 2. |
| 1 | Design and bake the island: the generated height field, erosion, masks for the settled south, then the world bounds (camera, fog, map, ocean, physics). Review the bare land from the hero views first. |
| 2 | Tree and shrub species, habitats from the baked moisture, slope and exposure layers, forest placement and groundcover. **In progress:** fog is shared by every material ([#219](https://github.com/brylie/mission-island/issues/219)), the [habitat classifier](#habitats) is built, and [the forest](#forest) is planted, drawn and solid to walkers. Graphics detail (Automatic, High, Low) is in Options. Still to come: groundcover, trails and footsteps. |
| 3 | The fire access road, its fallen logs (0.25–0.30 m, rounded, for the Fire and Rescue pickup) and the Alder Creek ford |
| 4 | The Fire Watch on Cairn Summit, backcountry fire sites, hidden ground and sightlines, snag burn scars. Highwood's places are 222–520 m from the Fire Watch, against 26–102 m for today's fire sites, so a backcountry callout needs the fire road or a role on the way. See [open questions](open-questions.md#questions-to-answer). |
| 5 | Docs, verification and a two-player playtest |

## Habitats

`highwoodHabitatAt(point)` in `src/worlds/starter/highwood-habitat.ts` reads the baked ground and returns a weight from 0 to 1 for each of Highwood's habitats, summing to 1, so stands blend at their edges. The rules follow the [Highwood habitat cards](field-guide/highwood-habitats.md); their numbers are in `src/worlds/starter/layout/highwood-habitats.ts`. Each habitat claims a share of what the ones before it left, in this order:

1. **Shore.** The first 2–14 m inland, where spray and sand keep trees back.
2. **Wet woodland.** The wettest ground within 6 m, from the baked drainage (flow accumulation), below about 10–18 m. Drainage lines are a cell wide, so a bank reads the creek beside it.
3. **Exposed ridge**, then **heath.** Wind exposure, or bare rock. Exposure mixes height, ground facing into the prevailing Windstone breeze, and how far a point stands above the ground 12 m around it.
4. **Bracken.** Gentle, deep-soiled slopes, in soft patches.
5. **Birch.** A grove on Birch Flats and a few patches elsewhere.
6. **Edges and gaps.** Openings in the canopy.
7. **Pinewood** takes what is left: it is the matrix the other habitats sit in.

The test (`test/highwood-habitat.test.mjs`) checks that pinewood covers the most ground, that every patch habitat appears, that Cairn's crown is ridge and that Birch Flats is birch. Today the dominant shares are about 43% pinewood, 12% birch, 10% bracken, 9% wet woodland, 6% edges, 4% heath, 2% ridge and 14% shore. Show the `highwood-habitat` [debug overlay](iteration-tooling.md) to see the mosaic on the ground. A sample costs about 11 µs, so placing a forest at load stays cheap.

## Forest

Highwood is planted in three layers from the [stand tables](../src/worlds/starter/layout/highwood-planting.ts): a canopy (one candidate per 5 m cell), an understory of shrubs, saplings and bracken (2.5 m) and deadwood (12 m). Each candidate rolls its habitat from the classifier's weights, then the habitat's cover, species and age. Plants keep off sand, steep ground and routes. Where wind exposure passes 0.5, trees and shrubs grow their exposed form and turn their lean downwind.

`npm run island:generate` bakes the planting after the terrain (`scripts/plant-highwood.mjs`): 7,516 plants at 8 bytes each, 59 KB. The host and every screen decode it in about 6 ms instead of classifying for about 180 ms at load. A source-hash test catches a stale bake.

- **Drawing.** `src/highwood-forest.ts`. Beyond 110 m, a tile's trees are merged far silhouettes, one mesh per 64 m tile and material. Within it they are detailed templates drawn as thin instances, one batch per template, rebuilt only when the set of near tiles changes; a 16 m dead band stops tiles flickering between tiers. Understory draws within 60 m.
- **Walking.** `src/highwood-solids.ts` sizes trunks, snags and logs with the tree catalog's collision, from the same seeds as the drawn trees, and files them in a 4 m grid. A walking check reads the few cells around a walker, about 0.7 µs. Logs can be stepped onto; shrubs and bracken are soft. Trees add no physics bodies.

## Performance

**Targets.** 60 fps on the development machine (an M1 Pro) in the tower, island and forest views, and 30 fps on older computers, such as a laptop with integrated graphics from about 2016, through a low quality tier. Players shouldn't notice the economies:

| Concern | Approach |
| --- | --- |
| Physics | Trees get no rigid bodies. Walking checks nearby trunks through a spatial grid, not every tree. Vehicles meet trunk colliders only along the fire road and tracks, merged into one body per tile. Each static body the host adds raises the cost of every physics step (see [#230](https://github.com/brylie/mission-island/pull/230)). |
| Draw calls | One template per species and age, drawn as thin instances, one call per template per 63 m terrain tile. Off-screen tiles are culled whole. |
| Detail | The near tree (600–1,500 triangles) switches to the far tree (60–160) by tile distance, with a dead band so trees don't flicker. Shrubs and groundcover stop beyond about 150 m, where fog and the ground texture take over. |
| Culling | Frustum culling per tile, and nothing past the fog's end. Babylon's occlusion queries answer a frame late and cost one query per mesh, so a ridge mask from known viewpoints comes first, and only if the numbers ask for it. |
| Older computers | **Options → Graphics → Detail**: Low renders at two-thirds resolution (about 44% of the pixels), turns off shadows, and pulls the detailed-tree range in from 110 m to 55 m and the understory from 60 m to 25 m. Automatic starts at High and drops to Low once, for the session, when frames average slower than 33 ms for 4 s after a 6 s settle. Tiers are in `src/assets/recipes/graphics-quality.ts`. |
| Guard rails | Draw calls, triangles and frame time per hero view, from `npm run capture`'s perf numbers. #198 tracks checking them in CI. |

**With the forest** (development machine, headless capture, `npm run capture`):

| View | Frame ms | Draw calls | Triangles |
| --- | --- | --- | --- |
| Cairn Summit, north at dawn | 4.1 | 584 | 636k |
| Fire road, midday | 4.7 | 802 | 2.21M |
| Birch Flats, evening | 4.0 | 639 | 661k |
| Fallow Ridge, looking home | 7.3 | 1,429 | 2.19M |
| Alder Creek ford | 4.3 | 708 | 1.43M |

All hold 60 fps here. The fire road and ridge views reach 2.2 million triangles, mostly near-tier crowns and their shadows, so older computers rely on the Low tier. Its savings are not yet measured on an older computer; that belongs to the two-player playtest.


Baseline on main `7a838c0`, in the `fire-watch` playtest, read with `?dev=1&perf=1` in the game address (see [the dev view URL](iteration-tooling.md#the-dev-view-url)). Compare the frame time and the draw calls; the browser pane's FPS is throttled.

| View | Frame ms | Draw calls | Triangles | Load ms |
| --- | --- | --- | --- | --- |
| Island view | 11.7 | 2,252 | 744k | 352 |
| Ground, Fire Watch stairs | 6.8 | 1,117 | 531k | 352 |

On the host, island start takes 36 ms and a tick 2.0 ms. A larger island must pad the physics heightfield to at least square: cannon-es clamps both ray-test indices to the heightfield's first dimension, so wheel raycasts would miss the far rows of a field that is longer north–south than east–west.
