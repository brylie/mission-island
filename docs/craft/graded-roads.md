# Graded roads

**Type: explanation (craft). Status: preview** (Workbench and game). **Last tended 2026-11-24.** Model purpose: **illustrate** how a built road sits in a hillside, not engineer one.

How Mission Island fits roads into its hills while the game loads: how a road finds its line and height, how the ground is cut and filled around it, how roads meet, where water goes, and how the surface is drawn without seams. The island's ground is a *heightfield*: one height for every point on the map. So a road can't tunnel or bridge. It can only reshape the ground. For the real practice behind all of this, read the [forest roads](../field-guide/practices/forest-roads.md) field guide entry. For the data and what other code may rely on, read [graded roads](../architecture.md#graded-roads) in the architecture guide.

## The goal: a road someone built

A forest road is built for cost and use. It runs straight where it can, bends to follow a contour or to switch back up a slope, and moves as little earth as its grade allows ([forest roads: where the line goes](../field-guide/practices/forest-roads.md#where-the-line-goes)). A player should read it as built: a level bed, banks cut into the hill above, fill spilled below, a rounded mouth where it leaves another road. It must never look like a ribbon laid over the ground, and never wave about on level ground for no reason. That last rule is a [design decision](../design/decisions.md).

A few words used throughout:
- **Carriageway**: the part wheels drive on.
- **Shoulder** or **verge**: the strip of soil and stone either side of it.
- **Formation**: carriageway plus shoulders, the flat bed the road is built on.
- **Crown**: how far the centre stands above the edges, so rain runs off.
- **Cut** and **fill**: ground dug away above the road, and ground built up below it.
- **Batter**: the slope of a cut or fill bank, written horizontal : vertical as in the [conventions](../conventions.md#space). A fill at 1.5 : 1 runs 1.5 m out for every 1 m down.
- **Bench**: a road dug fully into a steep side slope, with no fill hanging off the downhill side.
- **Bell-mouth**: the flared, rounded corners where one road joins another.

Road kinds (width, shoulder, grade limit, turning radius, batters, crown) and every grading setting live in [`road-kinds.ts`](../../src/assets/geometry/road-kinds.ts). This page names the settings and gives a few values; that file is the source.

## Centreline and profile

**Where the road goes.** A designer places dots in the [road designer](../workbench.md#design-roads) (`workbench.html#road-designer`) and bends each stretch between two dots. A bend moves a hidden knot in the middle of the stretch sideways by that many metres. The road is one smooth curve through every dot and every knot ([`road-shape.ts`](../../src/road-shape.ts)). The curve is a Catmull-Rom spline with *chord-length* tangents: each knot's tangent is scaled by the distances to its neighbours. A plain (uniform) Catmull-Rom overshoots where a short piece meets a long one, and can loop or form a cusp. A road with no bends runs straight between its dots and rounds each dot. A bent stretch passes exactly the bend's distance from the straight line at its middle. The road is then sampled every metre (`sampleStepM`).

**How high it runs** ([`road-profile.ts`](../../src/road-profile.ts)). A road builder balances cut and fill: follow the ground where the grade allows, and cut or fill only where it must ([forest roads: grade](../field-guide/practices/forest-roads.md#grade)). The solver does the same in three steps, then pins the road's ends:
1. Read the natural ground at five points across the formation and average them. Where the ground across the road is steep, bench it: move this target toward the lowest of the five points, so the road sits in the hill rather than on fill. The bench blends in from a side slope of 0.45 and is complete at 0.75 (`benchBlend` around `benchSideSlope`, 0.6).
2. Smooth those targets along the road over 20 m (`groundSmoothM`), so the road ignores small bumps.
3. Hold the grade limit with a forward pass, then a backward pass. Each sample may differ from the one before it by at most the limit times the run. The solver repeats this six times (`passes`), smoothing over 6 m (`passSmoothM`) in between so the grade changes have no kinks, then makes one final pair of passes.

A road's ends are treated differently. An end that joins another road is pinned to that road's surface. A free end is not pinned. Pinning it to the ground under the last dot made a road ending on a sharp peak jump to the summit in its last metres. Left free, it keeps its grade to the end.

## Cut, fill and banks

Beside the formation the ground is a bank: a cut rising to meet the hill, or a fill falling to meet it ([forest roads: cut and fill](../field-guide/practices/forest-roads.md#cut-and-fill)). [`road-banks.ts`](../../src/road-banks.ts) works out each side of each sample on its own. It walks outward from the formation edge in half-metre steps and asks where a bank at a given batter first meets the natural ground:
- A cut tries 1 : 1 (`cutSlope`), then halfway to a rock cut (0.625 : 1), then the rock cut itself, 0.25 : 1 (`rockCutSlope`, about 76°).
- A fill only tries 1.5 : 1 (`fillSlope`). One that can't meet the ground is flagged, and is graded at the rock-cut batter until the road is moved, though loose spoil couldn't really stand there. No shipped road has one.
- The first batter that meets the ground within the reach wins. The reach is 18 m (`reachM`) less a 1 m margin, so the grading's outer edge is never a step.
- Each side then takes the steepest batter within four samples either way, so a bank's slope changes smoothly along the road.
- Each bank also records how far out it meets the ground. Beyond that point it has no say.

If even a rock cut can't meet the ground, the bank is flagged, and the road designer warns: "Bank can't meet the ground … move the road". The steep side slopes that would need such banks are usually benched first, so there is no fill to place.

## A network, not a list

Highwood has four graded roads that meet each other and the village's paved harbor road. Roads that touch must agree about the ground between them. [`road-network.ts`](../../src/road-network.ts) lists the paved roads first, then the graded roads in file order. A road whose end lies on an earlier road's carriageway, plus 0.5 m of slack, joins that road; the earlier road is its *host*. A branch should leave at 30° or more. A shallower one slides along inside its host's formation, where the host owns the ground, so its real mouth ends up metres from the junction the network records. Paved roads are not graded. They lie on the natural ground, and their formation keeps the natural ground wherever a graded road overlaps it.

Every road's profile and banks are solved against the **natural** ground, never against ground another road has already shaped. Then [`road-grading.ts`](../../src/road-grading.ts) works out the final ground point by point:

1. **Candidates.** Every nearby road gives a *candidate*: how far the point is from that road's formation and carriageway, the road surface level with the point, and that side's bank batters and meet distances. A spatial index ([`road-index.ts`](../../src/road-index.ts)) finds them. It gives one candidate per *leg*: a sample nearer the point than the samples either side of it. Where a switchback brings two legs of the same road side by side, each leg gives its own candidate.
2. **Mouths.** At a junction, the branch's surface is blended toward the host's over 8 m from the host's formation edge (`mouthBlendM`, with a smoothstep). The two formations are joined with a *smooth minimum* of their distance fields over 8 m (`filletM`): a union whose corners are rounded, which is the bell-mouth. This only applies within 16 m of the branch's joining end. The blend joins the surfaces, not the grades: all three branches leave their hosts already at their limit (the spur and the Cairn ridge road at 15%, the Pine Draw road at 12%), where a builder would give the mouth a flatter landing.
3. **Inside a formation.** If the point lies inside any road's formation, the ground is that road's surface. Where formations overlap, the road earliest in the network wins. A host always comes before its branches, so a branch can never move its host.
4. **Outside.** Elsewhere every graded road's banks bound the ground. Each cut bank is a ceiling and each fill bank is a floor, each counting only out to where it meets the ground. The height is `min(lowest ceiling, max(natural ground, highest floor))`. Between two switchback legs, the upper leg's fill and the lower leg's cut both have a say, and the result is continuous. Where a cut and a fill disagree, the cut wins.

Order still matters. A road can only join a road listed before it, so order decides who can be a host. A branch's joining end is trimmed until its whole row across the road is clear of the host's formation, and pinned to the host's surface, so the host shapes the branch. Past that end the branch's strip carries on square back to the host's centreline, so an angled mouth leaves no wedge outside both formations. Order also decides who owns overlapping formations. It never lets a branch change its host.

The result is stored as height changes on a 1 m raster (`cellM`) in 16 m tiles (`tileCells`). The raster is built on the first height lookup, and every tile a graded road's formation, banks or mouth reaches is built then. Tiles no road reaches are never made and read as no change. Between nodes the raster is read bilinearly.

The grading object answers a handful of questions: `delta` (how far the ground moved), `clearance` (distance to the nearest graded formation edge), `carriagewayAt` (distances to carriageway, formation and paved carriageway), `fieldsAt` (all of a point's distances to the road edges, from one evaluation, for the surface mesh), `surfaceAt`, `near` and `culverts`.

## Drainage

A fill across a hollow becomes a dam, and a road dipping in a cut becomes a basin. Builders put a culvert (a pipe under or past the road) at each one ([forest roads: water](../field-guide/practices/forest-roads.md#water)). [`road-culverts.ts`](../../src/road-culverts.ts) finds them by flooding.

- **Flooding.** Over a 1 m lattice (`stepM`) covering the roads and 40 m round them, a *priority flood* works inward from the lattice's edge, always raising the lowest unvisited cell to at least the level of the cell it was reached from. The result is the level water would fill each cell to before it spills away: a cell's pond depth is that level less its height. The flood runs twice, once on the natural ground and once on the graded ground.
- **Basins.** A cell is wet where the graded pond is more than 3 cm (`pondM`) deep and more than 3 cm deeper than the natural pond. Connected wet cells standing at one water level form a basin, and each basin gets one culvert, at its lowest cell. Nothing depends on the order cells are visited, and flat shoulders, which hold no water, don't count.
- **The outlet.** Follow the natural ground downhill, up to 150 steps (`outletSteps`), until the earthworks change the ground by less than 5 cm (`sinkM`) and the pipe can fall at least 1% of its length (`minFall`), and at least 5 cm. A sag inside a cut may have no lower ground that way. Then search outward ring by ring, up to 40 m (`pipeReachM`), for the nearest untouched ground the pipe can fall to. A basin with no outlet keeps its culvert with no outlet, so a test can see it.

Culverts are found on first ask. The game asks after its first frame and draws each one ([`culverts.ts`](../../src/assets/culverts.ts)) as cross-drains are built. An inlet beside the road gets a dressed-stone headwall across the pipe's line, the pipe's dark mouth on the face the water meets. An inlet in a cut or on the road, a sag, drains through a drop inlet instead: a stone catch basin flush with the ground and capped with a grate, at the nearest spot off the carriageway. The outlet's headwall stands where the pipe leaves the fill, found by walking along the pipe's line until the ground is as nature left it, with a packed riprap apron five pipe diameters long widening below it. Ends within 1.5 m share one structure. Two gaps remain. A puddle shallower than 5 cm may stand on a verge on level ground, as at the trailhead. And the low side of the fire road's cut acts as a ditch and carries water from Cairn's lower slopes all the way down the road to the village plain, where on the natural ground it would have run west to the sea; real roads put cross-drains along a long grade to send water off sooner.

## Drawing the surface without seams

Every road, paved and graded, is drawn as one mesh ([`road-network-mesh.ts`](../../src/assets/road-network-mesh.ts)), so there is nothing to join. A 0.5 m grid (`roadSurfaceModel.cellM`) is laid only near the roads: each road's samples stamp a disc as wide as its formation, or near a junction as wide as its rounded mouth can reach. Each cell is split into two triangles, the way the terrain splits its cells, and each triangle is clipped to where the network's formation field is at or below zero. A clipped triangle is a triangle or a quad, always convex. Grid nodes inside the road are shared vertices, and a point where the outline crosses a grid edge is shared by the cells either side. The surface has no T-junctions and no overlaps by construction; a test checks that no edge is used by more than two triangles and that every mouth is covered.

Each vertex carries signed distances to the edges that matter: the carriageway, the paved carriageways and the graded formations, plus how far across its nearest road it lies, in half-widths. Distances change linearly across a triangle, so the road material ([`road-material.ts`](../../src/road-material.ts)) can turn them into crisp edges at any angle to the grid:
- asphalt on a paved carriageway, and on a graded road's formation within 6 m (`apronM`) of one: the trailhead's apron;
- a paved road's gravel shoulder;
- earth on a graded carriageway, crown in the middle, a paler edge, and darker ruts at 0.55 of the half-width that fade out within 5–14 m of a junction, where traffic spreads;
- the verge out to the formation edge.

A second, coarser sample of the gravel, turned and mixed in by noise patches, and broad and mid-scale tone noise keep the texture's repeat from showing. A skirt hangs 0.6 m below every outer edge (`skirtDropM`), so from a slope below a road you see a bank, not its underside. The terrain is cut to the road's outline: each terrain triangle is clipped to where the same formation field is above zero, so the ground stops at the road's edge at its true height, neither poking through the road nor dipping beside it. Physics and walking still read the true ground. The paved roads keep only their centreline dashes as a separate strip, draped on the ground.

## Suggest route and hairpins

The designer's **Suggest route** ([`road-suggest.ts`](../../src/workbench/road-suggest.ts)) proposes dots between two dots, as a surveyor walking the hill would. Its numbers are `roadSuggestion` in [`workbench-roads.ts`](../../src/assets/recipes/workbench-roads.ts). It reads the natural ground, blurred five times on a 4 m grid, because the road will be cut and filled through small bumps. It keeps off water.

- **The search.** A* search over states of (cell, heading, steps since the last hairpin, capped at the minimum leg). A step goes to one of 16 neighbours (the eight around a cell, plus eight knight's moves), and may only turn to a neighbouring heading. That keeps bends to about a 9 m radius, wide enough for the Fire and Rescue pickup. Grade under the limit costs little. Grade over it costs heavily (`overGradeWeight`), and grade over 1.6 times the limit is refused.
- **Hairpins.** A move that turns the road back on itself round a 12 m circle (`hairpin.radiusM`), through 135° to 225°. It is allowed only after a leg of at least 24 m (`minLegM`), which is why each state remembers the distance since the last one. It costs 40 m extra, and is refused where the slope across it is steeper than 0.5.
- **Straightening.** Each leg between hairpins is pulled straight: from each kept point, on to the furthest later point a straight line reaches within the grade, dry, and without turning more than 0.6 rad from the run before. Where a leg meets a hairpin, it must leave or join within half that turn limit of the hairpin's tangent.
- **Dots and bends.** The straightened legs are cut into dots 14 m to 40 m apart. Elsewhere each stretch's bend follows how far the path bows from the chord. Round a hairpin, each stretch's bend is the *sagitta* of its arc (how far the middle of a circular arc stands off its chord), so the curve through the dots and knots lies on the circle.

The result is a first draft. A designer then drags and bends it.

## The ground contract

There is one ground. `groundHeight` in [`terrain.ts`](../../src/terrain.ts) is `naturalGroundHeight` plus the road grading's `delta`. Everything that stands on the island reads it, so roads are real to everything at once:
- **Physics and movement**: the cargo physics heightfield (1 m spacing), truck wheels, and walking through `walkingHeight`.
- **The terrain mesh**: cut to every road's outline, paved and graded, junction mouths included.
- **Footsteps**: `roadSurfaceAt(point)` asks the network what a foot is on. It returns `asphalt` in a paved junction's apron, shoulders included, `earth` on a carriageway (mouths included), `verge` out to a graded road's formation edge, or nothing. The carriageway plays the footpaths' gravel voice, on the assumption that a forest road carries a thin, loose wearing course of stone over its compacted bed. [`audio/surface.ts`](../../src/audio/surface.ts) plays these as pavement, gravel and bare ground.
- **Planting**: `roadClearance(point)` is the distance to the nearest graded formation edge. Village trees, grass and Highwood's plants each keep their own distance from it; Highwood's is 3 m (`highwoodRouteClearanceM`). `roadEarthworks(point)` is how far the grading moved the ground. Through `clearOfEarthworks`, every Highwood plant except understory, and every granite outcrop, keeps off ground moved more than 0.15 m (`highwoodEarthworksM`, in [`highwood-planting.ts`](../../src/worlds/starter/layout/highwood-planting.ts)). Understory may grow on a bank no steeper than 40° (`highwoodBankCoverSlope`, through `coverCanGrow`), because steeper batters rarely green over. Banks are left to grass and ferns, as builders leave them.

Anything about the land before roads, such as the terrain bake, its drainage tests and Suggest route, reads `naturalGroundHeight`.

## Measuring

**Tests.**
- [`test/road-grading.test.mjs`](../../test/road-grading.test.mjs):
  - On made-up ground, it checks that the ground follows the profile and eases back to nature.
  - It checks that a 45° side slope is benched and its banks still meet the ground.
  - It checks that the ground between two switchback legs is continuous.
  - It checks that a branch leaves its host within 2 cm of the host graded alone.
  - It checks that a road ending on a peak keeps its grade.
  - A `walls` helper steps every half metre across each corridor. It fails if any step stands steeper than both the natural ground and a rock cut, with 0.5 of slack.
  - On the shipped roads, it checks for no designer warnings and no walls. It pins the six junctions by road id (including the depot lane on the harbor road), so a moved dot or reordered road can't silently leave a branch loose. It checks that every junction leaves its host as the host alone would be, and that each branch's graded end lies within twice its host's half formation of the recorded junction, which a branch leaving at under 30° fails. It traces rain from a grid of Highwood points and from the head of Alder Creek, over the same 1 m lattice as the culverts, and checks that every trace that reaches the sea over the natural ground still does over the graded ground, through the culverts. It also checks that every pond 5 cm or deeper has an outlet.
- [`test/road-footsteps.test.mjs`](../../test/road-footsteps.test.mjs) checks that the carriageway crunches as gravel, the verge sounds like bare ground, the trailhead apron sounds like pavement, and the ground past a free end stops sounding like a road.
- [`test/road-design.test.mjs`](../../test/road-design.test.mjs) pins the centreline and the profile solver.
- [`test/road-designer.test.mjs`](../../test/road-designer.test.mjs) pins Suggest route. It checks that a route is straight where a straight road holds the grade, and that it switches back in hairpins the pickup can take.
- [`test/game-fire-road.test.mjs`](../../test/game-fire-road.test.mjs) drives each vehicle up the spur's steepest straight stretch.

**Load cost.** In Node on the development machine, the four roads' profiles and banks take about 30 ms. The raster takes about 80 ms on the first height lookup near a road. Finding the culverts takes about 210 ms, for two floods over the roads' whole box, paid only when something asks for them; they should be baked before the game draws them. These match the figures in the [architecture guide](../architecture.md#graded-roads). A `groundHeight` call after that is one tile lookup and a bilinear read. Measure again on older hardware before adding many more roads. Baking the road layer is the way out if the network grows.

**Seeing it.** The road designer previews a draft's grading live. The `road-trailhead`, `road-spur-junction` and `road-ridge-junction` capture presets ([`capture-presets.ts`](../../src/assets/recipes/capture-presets.ts), see [iteration tooling](../iteration-tooling.md)) frame three of the junctions.

## What failed

- **Grading roads one after another.** At first each road was graded over the ground the roads before it had shaped. That made cliffs, walls between switchback legs, and a branch tilting its host. *Replaced by* solving every road against natural ground and resolving the whole network point by point, with candidates and the rule above. A test now checks that a branch leaves its host as the host alone would be.
- **One nearest sample.** The first spatial query returned only the nearest sample. At a switchback that was one leg, so the other leg's bank was ignored and a wall stood between them. *Replaced by* one candidate per leg, from local minima of distance.
- **Fixed batters.** Cuts at 1 : 1 and fills at 1.5 : 1 everywhere meant that on steep side slopes the fill never reached the ground. *Replaced by* benching on steep side slopes, and banks that steepen toward a rock cut until they meet the ground within reach.
- **Lapping the summit.** Suggest route's A* could only turn gradually, so it could not turn back through the fall line. It circled the summit instead of switching back. *Fixed with* an explicit hairpin move, a memory of distance since the last hairpin (the minimum leg), hairpins on true arcs, and entry and exit tangents when straightening.
- **Wavy roads.** Smoothing the found path gave curves on level ground, where nothing explained them. *Replaced by* straightening each leg wherever a straight line holds the grade, keeping curves for contours and hairpins.
- **Junction seams.** Each road's ribbon overlapped the other's at a junction, and an offset was used to hide the overlap. It showed seams and a bump. *Replaced by* one junction patch traced from the grading's formation field, clipped to where no ribbon lies. Clipping against a field that jumped to infinity past a ribbon's end left 0.5 m stair-steps, and the hairline cracks where patch and ribbon edges met showed grass; the field is now continuous, and the patch tucks just under the ribbons.
- **A sawtooth edge.** The terrain mesh's triangles poked through the ribbon's edge wherever a bank rose. *Fixed by* verge lanes out to the formation edge and by sinking the terrain under ribbons.
- **A bulging fillet.** A 12 m smooth-minimum fillet bulged the ground along the host's edge. *Reduced to* 8 m.
- **Culverts by distance.** At first a culvert was any hollow that was lowest among its neighbours, and hollows within 12 m shared one, keeping the lowest. Which hollows survived depended on the order they were visited, so the junction where Alder Creek's headwater crosses the roads got no culvert in the shipped run. Flat shoulders and cut floors under 5 mm deep each got a culvert. And the test, which compared how many rain traces stopped short, missed the creek, because culverts elsewhere drained natural dimples and evened the count. *Replaced by* basins from a priority flood, a minimum pond depth and pipe fall, and a test that follows each trace: water that reaches the sea over the natural ground must still reach it.
- **Culverts missed, one cause at a time** (in the first detector).
  - A strict "lowest" test missed flat-floored hollows. It now uses `>=`.
  - The neighbour stencil didn't match the drainage test's. Both now use the same 1 m circle of eight directions.
  - Walking a grid of points skipped some because of rounding. It now walks the raster's own nodes.
  - A fill's toe lay outside the moved area. The search now also looks two cells beyond it.
  - Sags inside cuts had no lower natural ground downhill. It now searches rings outward for the nearest lower ground.
  - The test's own rain tracer stepped over roadside ditches. It now steps 1 m.
- **Footsteps by distance.** Footsteps first asked only how far a point was from a road. So the verge crunched like gravel, and a junction mouth didn't crunch at all. *Replaced by* asking the network which surface a point is on (`roadSurfaceAt`).
- **Branches sliding along their host.** When the Cairn massif was reshaped, the spur left the fire road at about 9°, and the Cairn ridge road traced the Pine Draw road's hairpin for 35 m and the spur's last 70 m to the pad. The grading coped, because the host owns its formation, but each junction was recorded at the layout's end dot while the real mouth was far from it, so the junction patch and the footstep tests looked in the wrong place. *Fixed by* re-laying both roads to leave at about 50°, and a test that a branch's graded end lies at its recorded junction.
- **Angled rows overlapping their host.** A branch leaving at about 50° kept a first row whose far corner still lay inside its host's formation, so the two ribbons overlapped. *Replaced by* trimming until the whole row clears the host, and carrying the branch's strip square back to the host so no wedge is left outside both formations.
- **A tint step at the patch.** The patch used flat crown and verge colours while the ribbon blends crown, edge and verge across its lanes, so the mouth showed a step in colour. *Replaced by* blending the patch the same way, from its distances to the carriageway and formation edges.
- **Black slivers.** Clipping cells against a curved field leaves triangles too thin to light, and a self-crossing polygon's fan can wind backwards. *Now* patch triangles that wind backwards or are smaller than `patchMinAreaM2` are left out, and the patch tucks 15 cm under the ribbons and 2 cm lower, so what they would have covered is covered.
- **A lip at the Cairn ridge road's mouth.** From 10 m the branch's ribbon read as a raised lip with a thin dark crack below it, and the spur's mouth showed a sliver of grass. Changing the patch tuck, the terrain sink and the triangle filters did not move it. Two causes turned up. The join strip carried back from a branch's end stopped in a hard cut, so the formation field jumped from inside to outside in one step, leaving a sliver outside both roads; it now ends in a rounded cap, a capsule, so the field never jumps. And the separate pieces could never meet cleanly. *Replaced by* one mesh for the whole network ([#282](https://github.com/brylie/mission-island/issues/282)).
- **Separate pieces.** Ribbons, aprons, junction patches and the paved roads' flat strips each met the next at an edge that could tear, crack, overlap or open onto the sunk terrain, and the trailhead joined two materials at different heights. Each fix moved the seam rather than removing it. *Replaced by* one mesh over every road, with its finishes drawn from distances to the road's edges.
- **Seeing under the road.** On a fill, the sunk terrain fell away below the road's edge, and from the slope below you could see under it. *Fixed by* the skirt.
- **A sawtooth beside the road.** Sinking the terrain vertex by vertex left triangles straddling the road's edge sloping down below the true ground, so dark teeth showed along every edge where the ground fell away, and at the trailhead. *Replaced by* cutting the terrain to the road's outline.
- **Trees on the banks.** Plants kept only 3 m from the formation edge, so trees and logs stood on fill banks. *Now* everything but understory keeps off ground moved more than `highwoodEarthworksM`, and understory keeps off banks steeper than 40°.

## Not modelled yet

Ditches, rolling dips, running water and drawn culverts. Fords. Bends around wet ground, outcrops or old trees: Suggest route doesn't know about them yet, so it has no reason to bend on level ground ([decision](../design/decisions.md)).
