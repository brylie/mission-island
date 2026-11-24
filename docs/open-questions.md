# Open questions

**Status: index. Last tended 2026-11-23.**

One list of everything we know we don't know: research to do, sources to find, and things learned but not built. Each line links to the page or issue that owns it. Close a line by doing the work and removing it.

## Sources to find

- **Wildfire.** A fire-behaviour source for fuel, weather, topography and fighting tactics. UK spring fire timing and human ignition. Scots pine bark and fire, and recovery after burning. The New York State fire tower study behind the cross-bearing claim. See [wildfire](field-guide/processes/wildfire.md#sources).
- **Bracken.** Rhizome spread, soil and frost preferences, toxicity, wildlife and ticks. See [bracken slopes](field-guide/places/bracken-slopes.md#sources).
- **Wet woodland.** Waterlogging, alder's *Frankia* nodules, the hydrosere, wildlife, and flood and water roles. See [wet woodland](field-guide/places/wet-woodland.md#sources).
- **Clitter.** The rest angle of loose granite boulders, as against scree. See [granite uplands](field-guide/places/granite-uplands.md#in-the-game).
- **Highwood habitats.** Every *Life* line. See [Highwood habitats](field-guide/highwood-habitats.md).
- **Species figures.** Lifespans, flowering months and the heather life cycle, before any reaches game text. See [Highwood plants](field-guide/highwood-plants.md#sources).
- **Unopened sources.** Every `opened: false` entry in [`sources.yaml`](sources.yaml).
- **Sea-level rise since the ice age.** [The island's deep history](design/island-story.md#3-the-sea-rises-and-drowns-the-valley-mouths) says around 120 m. A search summary of Lambeck and others (2014, `lambeck-2014-pnas`) gives about 134 m at the glacial maximum, but the paper couldn't be opened. A person should read it before the figure is reworded.
- **Deep-history claims.** Most real-world claims in [the island's deep history](design/island-story.md#unsourced-to-add-before-this-page-leaves-draft) are unsourced: sandstone weathering, erratics, raised beaches, fjards, coastal sorting, snags, and the real size of glacial troughs. Only the U-shaped and hanging valley sentences are sourced. Several candidate sources are recorded unopened.
- **Granite uplands.** [Granite uplands](field-guide/places/granite-uplands.md#sources) lists its unsourced claims: slow cooling and mica, unloading joints, frost-loosened blocks sliding downslope, and the inference that grus lies where slopes ease. Only a tier-3 source ties granite's colour to its minerals.
- **Terrain technique sources.** The fBm coastline dimension, Beyer's droplet erosion and the scree angle in [island generation](design/island-generation.md) cite works recorded unopened in the register. The aspect claim there, that south-facing slopes are warmer and drier, has no source yet.

- **Bracken toxicity.** A search summary suggested the risk to livestock may be low, but its page couldn't be opened. "Bracken is poisonous to livestock" may turn out contested once that source is read.
- **Field guide species entries.** These still make real claims with no individual sources. Several are now sourced on the habitats page, such as juniper's decline, alder's nodules, siskins and otters. Link those source ids from the species entries.
- **Fire-finder primary sources.** The US Forest Service account (`usfs-osborne-firefinder`) was read on 2026-11-23 from its archived copy, because the live page returns 403. The New York State fire tower study (the PDF timed out) is still unopened. NWCG's intersection page (`nwcg-firefighter-math-location`) now sources crossing bearings at tier 1, so the tier 4 Wikipedia source on the wildfire page can be replaced.
- **Spotting and ranging.** A source for a wide exit pupil helping in poor light, for bracing to steady binoculars and higher magnification narrowing the field, for haze, smoke and rain washing out a distant view, and for how lookouts are trained and staffed. A current recognised guideline for the binocular safety box (never look at the sun through binoculars; never aim a rangefinder at eyes), which then needs a human safety review. A physics textbook or agency source for distance = c·t/2, to replace the tier 4 Wikipedia citation. NWCG and US Forest Service quotes were read from Wayback copies because the live sites refuse automated reading, so the quote checker reports them unfetchable. See [spotting and ranging](field-guide/practices/spotting-and-ranging.md#sources).
- **Wildfire safety box.** A person must check the box against the Scottish Fire and Rescue Service page before the wildfire page can be verified.
- **Forest roads.** A typical figure for how steep a cut bank stands, the size of a typical bell-mouth, who does forest road maintenance in practice, and whether unused roads green over between the ruts first. Forestry Commission Bulletin 43 (`fc-bulletin-43-forest-roads`, 1976) is a scanned PDF with no text layer and needs OCR or a person to read it. The two US sources, `usfs-low-volume-roads` and `nydec-unpaved-forest-roads`, are still unopened and no longer cited. The Operations Note 25 quotes (`fc-on025-forest-roads-tracks`) were extracted from the PDF by script and need a person to check them against it. See [forest roads](field-guide/practices/forest-roads.md#sources).
- **Ford safety box.** A person must check the flood-water box in [forest roads](field-guide/practices/forest-roads.md#fords) against the current Ready Scotland and Scottish Fire and Rescue Service pages before that page can be verified.
- **Archive failures.** Four Wildlife Trusts pages couldn't be saved to the Wayback Machine. Nor could, on 2026-11-23, `nikon-laser-30`, `vortex-rangefinder-modes`, `fda-laser-classes` and `os-three-norths`. Save Page Now also failed (520) for both ruralpayments.org pages, `scot-fgs-forest-road` and `scot-fgs-bellmouth`, so they link older snapshots; the bell-mouth one predates the current version. Try again later or from a browser.
- **Moved pages' shapes.** The wildfire, bracken slopes and wet woodland pages still use their own headings, not the framework's process and place shapes. Reshape them in a later edit, and fix any anchors that change.
- **Two alder quotes not found.** `node scripts/check-source-quotes.mjs` couldn't find the Woodland Trust alder quotes about siskins and otters on the page; the fetcher probably paraphrased them. Check them on the page, or find the actual wording.
- **Quote checks.** A person needs to check each `quote-via: fetcher` quote in the sources register against its page, before those claims can be marked checked.
- **Logs on slopes.** Do fallen trees on a slope tend to come to rest across it? The island lays every log along the contour; real windthrow mostly points downwind. Unsourced. See [deadfall log](field-guide/highwood-plants.md#deadfall-log).
- **Scotland's prevailing wind.** That the Highlands' prevailing wind is south-westerly needs a Met Office climate source. See [exposed ridge](field-guide/highwood-habitats.md#exposed-ridge-toward-windstone-ridge).
- **Footstep surfaces.** The litter footsteps assume pine duff is soft and quiet, broadleaf litter crackles, moss squelches and heather swishes. None of these is sourced. See [the forest's ground cover](backcountry.md#forest).
- **Archiving.** No source has an archived copy yet. Saving pages to the Wayback Machine sends their URLs to an outside service, so it needs the maintainer's go-ahead.

## Planned, not built

- Seasonal change for trees and shrubs: [#211](https://github.com/brylie/mission-island/issues/211).
- Downy birch for wet ground: [#212](https://github.com/brylie/mission-island/issues/212).
- Graded wind exposure: [#213](https://github.com/brylie/mission-island/issues/213).
- Old forms for shrubs and deadwood: [#214](https://github.com/brylie/mission-island/issues/214).
- Craft pages for procedural audio, procedural landscape and wildlife behaviour. See [craft](craft/README.md#pages).
- An inland outcrop layer. The habitat classifier's rock term reads only the baked coastal rock, so inland heath and ridge come from wind exposure alone. The outcrop meshes don't feed the classifier either. See [Highwood backcountry](backcountry.md#habitats).
- Bigger tors on Cairn Summit. The reshaped massif has a few small tors on its brow and ledges on its north-east face, but from a kilometre off the 80 m face still reads smooth. Real tors there would be several metres high and need their own shapes: brow tors of three slabs, 3–4 m tall, so one breaks the outline from `highwood-cairn-southwest`, and a check of the north-east face in morning light. A lone slab on the skyline still reads a little boxy. See [granite uplands](field-guide/places/granite-uplands.md#where-the-island-differs).
- Route clearance for Phase 3. Plants keep 3 m (`highwoodRouteClearanceM`) from a graded road's formation edge, but still 3 m from the centreline of every other route, which is less than a paved road's half-width plus shoulder, 4.4 m (`roadSurface` in `src/assets/geometry/route-profiles.ts`: 6 m wide, 1.4 m shoulders). Other routes need a clearance by route kind. See [Highwood backcountry](backcountry.md#phases).
- Road drainage and junctions. Culverts are placed but not drawn, and there are no ditches or rolling dips. Junction mouths aren't sized to a vehicle's turn, and the benching range (45–75% side slope) was set by eye around the 50–55% the FAO manual gives. See [forest roads](field-guide/practices/forest-roads.md#where-the-island-differs).
- A stable plant ID for Phase 4. Burn scars and other per-plant state should key on a plant's layer and planting cell, not its place in the bake. See [Highwood forest](architecture.md#highwood-forest).
- Reference photos for the procedural terrain model: granite tors, outcrops and clitter, U-shaped valleys, fjards and scree, with licence and author, stored beside the generation parameters as `tree-references.ts` is for the Highwood trees.

## Questions to answer

- Is the Highwood near-to-far tree switch, at 80 m to a tile's nearest point with a 16 m dead band, invisible in the game camera? The Workbench suggested about 100 m for one tree. See [rendering and detail](craft/rendering-and-detail.md#hiding-the-switch).
- Why did far crowns vanish when the far merged meshes shared a foliage material with the near thin instances, once the scene fog plugin was on? Far material copies work around it, but the cause is unknown. See [rendering and detail](craft/rendering-and-detail.md#what-failed).
- Does the Low graphics tier hold 30 fps on an older computer? It is not yet measured on one; that belongs to the two-player playtest. See [Highwood backcountry](backcountry.md#performance).
- Should a graded dirt road sound like packed earth? Footsteps on it crunch like a gravel path (`groundSurface` in `src/audio/surface.ts`), but it looks like packed earth with wheel ruts. Either the sound or the look should change. See [forest roads](field-guide/practices/forest-roads.md#in-the-game).
- Should vehicle sound change with the surface? The truck engine (`src/audio/truck-engine.ts`) sounds the same on asphalt, gravel, dirt road and grass.
- How do we check the player map headlessly? `scripts/capture.mjs` captures the 3D view but not the in-game map, so a road change to the map can only be checked by playing.
- Should the fire model add slope, a second lookout for cross-bearings, or fuel types? Each would reduce a [misconception](misconceptions.md).
- How should a crew reach a backcountry fire? Highwood's places are 222–520 m from the Fire Watch, against 26–102 m for the current fire sites, so a callout there needs the fire road or a role on the way. See [Highwood backcountry](backcountry.md#phases).
- Can the generated coast reach a real rocky coast's fractal dimension? [The current bake](design/island-generation.md#the-current-bake) measures 1.09 against a 1.2–1.3 target, because a dome plus noise reads near 1 at fine scales.
- How are real fire crews organised? It would be the second *practice* entry after [spotting and ranging](field-guide/practices/spotting-and-ranging.md), and would start the knowledge base's social side.
- Should the knowledge base have a misconceptions debrief for teachers after a play session, as research on the game *Eco* suggests?
