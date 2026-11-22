# Highwood backcountry

**In progress.** Highwood is the wild country north of Starter Island's settled south: forest, meadow, ridge and creek, with a fire access road and the Fire Watch on Cairn Summit. It is where the crew watches for smoke and drives out to fight it. The land comes from [the island's deep history](design/island-story.md), and it is generated as described in [island generation](design/island-generation.md).

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
| 0 | Branch, baseline and hero-view captures at their nearest current equivalents |
| 1 | Design and bake the island: the generated height field, erosion, masks for the settled south, then the world bounds (camera, fog, map, ocean, physics). Review the bare land from the hero views first. |
| 2 | Tree and shrub species, habitats from the baked moisture, slope and exposure layers, forest placement and groundcover |
| 3 | The fire access road, its fallen logs (0.25–0.30 m, rounded, for the Fire and Rescue pickup) and the Alder Creek ford |
| 4 | The Fire Watch on Cairn Summit, backcountry fire sites, hidden ground and sightlines, snag burn scars |
| 5 | Docs, verification and a two-player playtest |

## Performance

Baseline on main `7a838c0`, in the `fire-watch` playtest, read with `?perf` in the game address. Compare the frame time and the draw calls; the browser pane's FPS is throttled.

| View | Frame ms | Draw calls | Triangles | Load ms |
| --- | --- | --- | --- | --- |
| Island view | 11.7 | 2,252 | 744k | 352 |
| Ground, Fire Watch stairs | 6.8 | 1,117 | 531k | 352 |

On the host, island start takes 36 ms and a tick 2.0 ms. A larger island must pad the physics heightfield to at least square: cannon-es clamps both ray-test indices to the heightfield's first dimension, so wheel raycasts would miss the far rows of a field that is longer north–south than east–west.
