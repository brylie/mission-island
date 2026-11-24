# Rendering, distance and level of detail

**Type: explanation (craft). Status: preview.** **Last tended 2026-11-24.**

How to draw thousands of trees, rocks and plants without the game slowing down, and why detail should follow distance. The examples come from the Highwood species work. The ideas apply to any scenery that repeats: shrubs, rocks, fences or crowds. For how the trees themselves are grown, see [Procedural flora](procedural-flora.md).

## Detail follows what the eye can see

A 13-metre pine 10 metres away fills the screen; 100 metres away it is a small mark. A rough guide is the angle an object covers: its size divided by its distance, in radians. The 13 m pine at 100 m covers about 0.13 radians, roughly 7.5°. In a view about 45° tall, that is around a sixth of the screen's height. Detail that is too small to see still costs the computer time to draw. So we keep two models of each tree:

| Tier | Triangles (trees) | What it keeps |
| --- | --- | --- |
| **Near** | 600–1,500 | Branch arcs, lobed clumps, bark colour bands, forks and gaps |
| **Far** | 60–160 | Trunk, the two longest limbs, one mass per limb group, main sky gaps |

Shrubs (100–800 near, 24–120 far) and deadwood (150–800 near, 24–120 far) have smaller budgets because there are many more of them. The numbers live in `templateBudgets` in `src/assets/geometry/tree-species.ts`, and a test checks every species against them for every age, exposure and twelve seeds.

## Hiding the switch

Swapping a near model for a far one is called a *level-of-detail* (LOD) switch. Done badly, players notice a tree "pop" as they walk. What made the Highwood switch hard to notice:

- **Keep the silhouette, not the detail.** The far model is built from the same seeded skeleton as the near one, so it has the same trunk lean and limb directions. Dropping limbs made distant crowns visibly thinner. Merging them into the nearest kept mass fixed it.
- **Match the outline precisely.** Far masses are fitted to the true top and bottom of the clumps they replace, including flat undersides, so the tree neither grows nor floats when it switches.
- **Avoid shapes that read differently.** Masses with one ring of vertices looked like diamonds; two rings read as soft lumps. The extra 40 or so triangles were worth raising the far budget from 120 to 160.
- **Switch where the change is below notice.** In the Workbench's distance layout, the switch on a 13 m pine was still visible at about 75 m and invisible at about 100–110 m. The study defaults to 100 m. A game camera with a wider field of view makes objects smaller on screen, so check the distance again with the real camera. The game switches whole 64 m tiles, not single trees: a tile turns near at 80 m from the camera to the tile's nearest point, and turns far again only beyond 96 m. That 16 m *dead band* stops a tile flickering between tiers as the camera hovers near the line. Whether 80 m is invisible in the game camera is an [open question](../open-questions.md#questions-to-answer).
- **Test at a fixed camera.** The **Tier switch by camera distance** layout stands both tiers on one spot and flips between them as the camera crosses the slider's distance. Flipping the slider without moving the camera is the most honest test.

## Triangles are not the only cost

A graphics card is fast at drawing many triangles in one batch, and slower at starting many separate batches. Each separate *draw call* (a mesh with its own material) carries overhead on the main processor. For a forest, the number of draw calls often matters more than the number of triangles.

- **Share materials.** Every Highwood species uses one of three materials: bark, needles or broadleaf. Species differ through vertex colour, not separate materials, so a whole forest can be drawn in a handful of batches.
- **Thin instances.** A *template* is one tree baked into a mesh once. *Thin instancing* then draws that same mesh many times, each copy given only a position, rotation and scale. Thousands of copies cost little more than one. `src/second-island/plant-scenery.ts` shows the island's pattern: group instances into tiles, give each tile its own instance buffer, and switch tiles on and off by distance.
- **Highwood's pattern is different.** `src/highwood-forest.ts` keeps one thin-instance batch per template across all near tiles, rebuilt only when the set of near tiles changes. That keeps near trees to a few draw calls, but a batch can't be culled per tile, so off-screen near trees still draw. The far tier is merged instead: one mesh per 64 m tile and material, culled whole when the tile is off screen.
- **Cap the variants.** Each template is a separate mesh, so 14 species × 3 ages × 2 exposures × several seeds × 2 tiers multiplies quickly. Use a few seeds per combination, and scale and rotate each instance a little so repeats don't line up.
- **Merge per material.** Each template merges all its bark into one mesh and all its foliage into another, rather than keeping a mesh per branch.

## Flat shading costs vertices, not triangles

The island's faceted, flat-shaded look gives each triangle its own three corners, so a light-catching facet has one normal. A shared-vertex mesh can reuse corners between neighbouring triangles. Faceting roughly triples the vertex count for the same number of triangles. That is affordable at these budgets, but it is the reason budgets are stated in triangles and kept modest.

## Colour that survives bad light

Shading from the sun disappears under overcast skies and at a distance. Baking light and shade into vertex colour keeps trees readable in any weather:
- lighter on top, darker underneath and toward the crown's centre;
- a distinct value per species.

A greyscale view is a quick check that species stay distinguishable by value alone. The [colour direction](../design/color-direction.md) explains the island's wider palette rules.

## Ground that doesn't tile

A texture repeats. Paint a hillside with one granite tile 2 m wide and the eye finds the repeat at once, because real ground varies at every scale at the same time. Highwood's ground shader (`src/beach-material.ts`) layers that variation on top of its textures instead of using bigger textures:

- **Three noise wavelengths.** Smooth value noise in world space at about 29 m, 5 m and 1 m (`groundVariation` in `src/assets/geometry/starter-landscape.ts`) changes brightness and warmth over turf, litter and cover. No two tiles of the texture then get the same light or tint, so the repeat stops reading.
- **Ragged edges.** Layer weights come from the 4 m baked rasters, and smooth vertex blends look like airbrushed gradients. Scaling each weight up or down with the noise breaks litter, heath, moss and bracken into clumps; scaling, rather than adding, keeps ground with no cover at none. Bare rock instead has its blend pushed only in the middle, by noise times `4w(1 − w)`, so rock patches into turf at its edges but full-rock cliffs stay full. Scaling rock down by the noise let turf show through sandstone cliffs.
- **Shapes from the real thing.** The granite isn't a texture but a pattern built from what granite does (see [granite uplands](../field-guide/places/granite-uplands.md)). Two wandering joint sets cut slabs, and many cross joints stay closed so slabs run long. Rounded clasts in grit draw grus. Lichen and streaks follow the noise. The crystal texture is shown near true size, as fine grain only. A first try used a cell (Voronoi) pattern for the blocks, and it read as crazy paving. A strict grid of joints read as brickwork. Irregular, half-closed joints were what made it look like rock. Letting the fine noise bend the joints drew worm tracks, so only the broad and mid noise move them. Crystal speckle at full contrast on bedrock read as camouflage, so faces keep 70% of it, patchily.
- **Relief without geometry.** A displacement map would move vertices, but the terrain has one every few metres, far too coarse for stones. Instead the noise returns its own slope, at no extra cost (an *analytic derivative*), and the shader tips the lighting normal by it. Joints, block tilts and stone domes then catch low sun. The outline against the sky stays smooth. Real outcrop meshes fix that, and Highwood has them now (below).
- **Fade with distance.** Stones and roughness fade to their average colour between 18 and 48 m, and relief between 14 and 42 m. Smaller than a pixel, they would shimmer and still cost time. The metre-scale mottling lasts to 60–140 m, and the broad and mid noise never fades, so the overlook keeps variation. The fade uses distance, not screen-space derivatives, so it looks the same on Low, which renders fewer pixels.
- **Cost.** Each pixel does three value noises, plus, on rock near the eye, one search of nine grid cells for the grus and one more noise for roughness. Far pixels skip the near-only work: any value that is only ever used multiplied by the detail weight is computed behind `detail > 0.`, as the granite's joint openings are. On an M1 Pro, frame time in the Cairn captures stayed within about a millisecond (4–6 ms). The fog plugin mixes after lighting, so these changes pass through it unchanged. There is no Low-tier switch yet: Low draws fewer pixels, but each runs the same shader.
- **Outcrops as real geometry.** Granite outcrops and clitter boulders stand where the shader draws bedrock, so the rock reads the same in shape and colour. They are flat-faceted slabs merged into one mesh per 64 m tile, so off-screen tiles are culled and a whole tile costs one draw call. Their placement is worked out at load from the terrain (about 50 ms in Node), not baked. The host's walking solids and every screen use the same list, and a rebaked hill gets new rocks without a rebake of its own. What the Art Director caught: octagonal slabs read as drums, so blocks are rectangles with small corner cuts. Standing a block on the highest ground under it made a wall on its downhill side, so blocks stand 42% of the way up the slope under them. The architecture review caught a round walking footprint that let walkers clip the long ends, so each slab is now its own capsule-shaped solid. Narrow stacks centred on each other read as trail-marker cairns, on a hill named Cairn, so steep-face crags lie long and low along the contour with any upper slab set off. Under a crag the ground may fall at most 1.3 times the stack's height (`faceRatio`), so steeper spots stay bare rather than standing pillars. On a steep face the limit is 1.8 times, with the downhill foot sunk deeper. An upper slab slipped past the edge of the one below read as a roofed box, so upper slabs stay within the slab below except on the uphill side, where they meet the rising ground.
- **Seen from above.** The joints and grus are drawn in world x and z, so on a 45° slope they stretch about 1.4 times downslope. Drawing them from three sides, like the crystal grain, would double their cost.

## Keep rendering and rules apart

The multiplayer host, which decides where players can walk, must not depend on graphics or texture code. `treeCollision(options)` computes a tree's trunk size from the same seeded numbers the mesh uses, without building the mesh, so host and renderer always agree. Shrubs and bracken report their size but are marked as soft cover rather than solid. The [architecture guide](../architecture.md) describes this split between shared rules and presentation.

## Draw the ground where the feet stand

Highwood's terrain is drawn in 64 m tiles of 1 m cells laid on the height bake's own 2 m grid, so every other vertex is a bake node; beyond 160 m a tile draws every other vertex, a 2 m grid (`terrainTile` in `starter-landscape.ts`). Normals and the slope tint come from the ground function either side of each vertex, so neighbouring tiles agree at their shared edge.

## What failed

- **Terrain off the data's grid.** Highwood's terrain once sampled the ground every 1.5 m from its own origin, off the bake's 2 m grid. In creases its flat triangles cut across the true surface and drew the ground up to 0.83 m above where players stand: 2.5% of the land by more than 15 cm, so feet sank in, sometimes to the waist. Normals computed per tile also left 63 m seams in the lighting. *Replaced by* the aligned 1 m grid (0.01% over 15 cm) and normals from the ground function, with a test holding the drawn ground within 0.2 m of the walking height.

- **Far crowns vanished.** When the far merged meshes shared a foliage material with the near thin instances, with the scene fog plugin on, the far crowns disappeared once both tiers drew. The cause is still unknown. The far tier now uses its own copies of the tree materials, which works around it. See the [open question](../open-questions.md#questions-to-answer).
- **Clones drop unregistered plugins.** Cloning a Babylon material keeps its GPU textures, but rebuilds its plugins by class name. A plugin not registered as `BABYLON.<className>` is silently dropped from the copy. The scene fog plugin is registered for this reason; see the [scene fog contract](../architecture.md#highwood-forest).
- **Granite stitched like photos.** A playtester said Cairn Summit's rock looked like images stitched together without blending. Each joint block had its own hashed tone, tilt and lichen, and they changed at every block edge, including the shut joints drawn with no crack, where the change had nothing to hide behind. Rows also shifted their cross joints, long joints opened on a fixed 2.6 m grid that lined up with no block, and joint lighting switched sides at a hard line. Now every step sits behind an open crack of matching width. Across a shut cross joint the block ramps into the next one. Near a shut long joint both rows fade to one smooth noise field they share, with its own tone and tilt so the fade doesn't level into a groove. A long joint opens block by block and eases at the ends. Each crack's lighting slope is added rather than picked, so it is zero where it changes sign. A crack about to close fades in shade and relief instead of ending as a dark, shimmering point. The tone step fades with distance just as the crack's shade does, so past the detail fade every joint counts as shut, and the openings aren't computed there at all. Two tries failed first. Tapering cross cracks over the same 0.45 m as the tone blend turned them into needles, so cracks taper over 0.15 m (`crackTaperM`). Long cracks eased over a quarter of a block read as brushstrokes, so they now ease over an eighth (`jointEndShare`). There is no debug switch for the seam check, so edit the data for the run and revert afterwards. In `highwoodGranite.blocks`, set `closedCrossShare` to 1, `closedSheetShare` to 0.999 (1 divides by zero in the opening's remap) and `jointShade` to 1, and leave the block tilt on. Then capture in greyscale under a low sun (`--hour 8`). Any line left is a seam. `ground-cairn-midrange` frames the bare face 25–45 m off, where cracks fade out.
- **Geometry kept twice.** Babylon's `Buffer` keeps the JavaScript array it is given (`@babylonjs/core` 9.37.1, `Buffers/buffer.pure.js` line 49). Geometry built as a plain `number[]` therefore stays in memory after upload at 8 bytes per number. The far merge builds `Float32Array`s, 4 bytes per number. It keeps them rather than calling `clearCachedData()`, because Babylon rebuilds GPU buffers from them after a lost WebGL context.

## Measuring

Budgets are a starting point; frame time is the truth. The [Art Director skill](../../.agents/skills/mission-island-art-director/SKILL.md) asks for a before-and-after comparison on the same laptop, camera, viewport and route whenever a scene gets denser. Count active meshes and frame time in the Workbench readouts. Prefer one honest measurement over many estimates.
