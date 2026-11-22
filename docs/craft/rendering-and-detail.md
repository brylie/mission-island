# Rendering, distance and level of detail

**Type: explanation (craft). Status: preview.** **Last tended 2026-11-22.**

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
- **Switch where the change is below notice.** In the Workbench's distance layout, the switch on a 13 m pine was still visible at about 75 m and invisible at about 100–110 m. The study defaults to 100 m. A game camera with a wider field of view makes objects smaller on screen, so check the distance again with the real camera.
- **Test at a fixed camera.** The **Tier switch by camera distance** layout stands both tiers on one spot and flips between them as the camera crosses the slider's distance. Flipping the slider without moving the camera is the most honest test.

## Triangles are not the only cost

A graphics card is fast at drawing many triangles in one batch, and slower at starting many separate batches. Each separate *draw call* (a mesh with its own material) carries overhead on the main processor. For a forest, the number of draw calls often matters more than the number of triangles.

- **Share materials.** Every Highwood species uses one of three materials: bark, needles or broadleaf. Species differ through vertex colour, not separate materials, so a whole forest can be drawn in a handful of batches.
- **Thin instances.** A *template* is one tree baked into a mesh once. *Thin instancing* then draws that same mesh many times, each copy given only a position, rotation and scale. Thousands of copies cost little more than one. `src/second-island/plant-scenery.ts` shows the island's pattern: group instances into tiles, give each tile its own instance buffer, and switch tiles on and off by distance.
- **Cap the variants.** Each template is a separate mesh, so 14 species × 3 ages × 2 exposures × several seeds × 2 tiers multiplies quickly. Use a few seeds per combination, and scale and rotate each instance a little so repeats don't line up.
- **Merge per material.** Each template merges all its bark into one mesh and all its foliage into another, rather than keeping a mesh per branch.

## Flat shading costs vertices, not triangles

The island's faceted, flat-shaded look gives each triangle its own three corners, so a light-catching facet has one normal. A shared-vertex mesh can reuse corners between neighbouring triangles. Faceting roughly triples the vertex count for the same number of triangles. That is affordable at these budgets, but it is the reason budgets are stated in triangles and kept modest.

## Colour that survives bad light

Shading from the sun disappears under overcast skies and at a distance. Baking light and shade into vertex colour keeps trees readable in any weather:
- lighter on top, darker underneath and toward the crown's centre;
- a distinct value per species.

A greyscale view is a quick check that species stay distinguishable by value alone. The [colour direction](../design/color-direction.md) explains the island's wider palette rules.

## Keep rendering and rules apart

The multiplayer host, which decides where players can walk, must not depend on graphics or texture code. `treeCollision(options)` computes a tree's trunk size from the same seeded numbers the mesh uses, without building the mesh, so host and renderer always agree. Shrubs and bracken report their size but are marked as soft cover rather than solid. The [architecture guide](../architecture.md) describes this split between shared rules and presentation.

## Measuring

Budgets are a starting point; frame time is the truth. The [Art Director skill](../../.agents/skills/mission-island-art-director/SKILL.md) asks for a before-and-after comparison on the same laptop, camera, viewport and route whenever a scene gets denser. Count active meshes and frame time in the Workbench readouts. Prefer one honest measurement over many estimates.
