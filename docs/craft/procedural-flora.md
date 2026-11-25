# Procedural flora

**Type: explanation (craft). Status: preview** (Workbench). **Last tended 2026-11-25.** Model purpose: **illustrate** recognisable species and their growth, not predict real tree architecture.

How Mission Island grows trees, shrubs and groundcover from rules and seeds. It also covers why each technique was chosen, what it stands in for in a real plant, and what we learned building the Highwood species generator. Code lives in `src/assets/trees/`, and the species tables are in `src/assets/geometry/tree-species.ts` and `shrub-species.ts`. You can watch everything here in **Ecology → Plants → Highwood species** in the [Workbench](../workbench.md#compare-highwood-tree-species). For the real species, see the [field guide](../field-guide/highwood-plants.md).

## The goal: read the species, not the leaves

A forest fills most of the frame in backcountry, so trees carry much of the feeling of a place. The aim was about two-thirds of the way toward [Firewatch](https://www.firewatchgame.com/)'s stylised trees, in the island's own warm, faceted, toy-scale look. That game's well-known lesson is that a small set of carefully shaped trees, repeated many times, reads as a convincing forest. They work because their **silhouette and gesture** are right, not because of leaf detail.

So the generator spends triangles on shape:
- how a trunk tapers and sweeps;
- how a branch leaves the trunk, sags and lifts;
- where the crown has gaps.

It spends almost nothing on surface detail. A tree should be recognisable as a flat black shape. The Workbench's **Silhouette** view tests exactly that.

## From seed to tree

### Seeded, keyed randomness

Every plant is grown from `{ species, age, exposure, seed, tier }`. All variation comes from seeded pseudo-random numbers, so the same inputs always grow the same tree on every computer. That matters in a co-op game, where two players must see the same forest without sending it over the network.

A naive generator draws all its random numbers from one sequence, so changing anything early (one more branch, say) shifts every later number and reshuffles the whole tree. Instead, each part of the plant draws from its own stream, keyed by what it is: the trunk, stem 2, branch 5, the clump on branch 5. The key is hashed together with the seed and a per-species salt (`seedStreams` in `tree-catalog.ts`). As a result:
- An old tree and a young tree from the same seed share their branch layout and gesture. You can see the same individual at two ages.
- The near and far versions make the same fork decisions, so the distant silhouette matches the close one.
- The species salt comes from a hash of the species' name, not its position in a list. Adding a new species never changes trees already placed on the island.

### Trunk: taper, flare and sweep

A trunk is a tube along a curved spine (`addTube` in `tree-mesh.ts`). Its radius tapers toward the top, and a *flare* widens it at the ground, as real trunks swell into their root collar. It continues a little below ground, and the forest stands it on the lowest ground under its base (see Standing on a slope), so it never floats on a slope.

Real trunks are rarely perfectly straight:
- **Sweep.** Each seed gives a gentle bow in a random direction.
- **Meander.** A slower side-to-side wander along the trunk.
- **Wind.** On exposed sites the whole stem bends downwind, more near the top.

Rings are packed toward the top, where the bend is strongest. The tube uses *parallel-transported* frames, a standard technique that stops a bending tube from twisting.

### Branches: rise, droop and lift

A conifer or broadleaf branch has a recognisable *gesture*. It leaves the trunk on a shallow rise, sags under the weight of its foliage, and its growing tip turns upward toward the light. Each branch follows a simple curve in three terms:

```
height(t) = length × (rise·t − droop·t² + lift·max(0, (t − liftFrom)/(1 − liftFrom))²)
```

`t` runs from the trunk (0) to the tip (1).
- **rise** is the departure angle.
- **droop** is weight pulling the middle down.
- **lift** curls the tip back up after `liftFrom`.

The species tables set the three numbers:
- **Pine:** a shallow rise, a strong droop and a clear tip lift.
- **Silver birch:** a steep rise and a heavy droop with no lift, which gives its weeping twigs.

On exposed sites, a *drift* term pushes every branch downwind. Windward branches are shortened and leeward ones lengthened, which produces the one-sided *wind flagging* seen on coastal trees.

Branches are placed in *whorls* for pine, which grows a tier of branches each year, and in a spiral for broadleaves. The spiral steps around the trunk by the *golden angle*, about 137.5°, the same spacing many real plants use. It spreads branches evenly without lining them up. Every placement then gets a small seeded jitter.

### Forks make the gaps

A crown needs **openings where branches divide**, or it reads as a solid ball. Each branch may *fork* by chance. It stops partway, and two shorter children diverge from the fork point, each carrying its own foliage clump. The sky between the two children is an opening by construction, not by luck. A per-tree limit keeps the crown to the art brief's 3 to 9 clumps, so forks are spent only where there's room.

### Clumps: faceted, lobed and lit by vertex colour

Foliage is drawn as a few large clumps, not leaves. Each clump is a low-poly dome (`addPad`):
- flattened underneath, like the pads of a pine;
- *lobed*, with a slow ripple around its rim so it never reads as a perfect sphere;
- given finer per-vertex noise for a hand-shaped look.

Two seeds of the same species get different lobes and noise, because the noise is keyed by seed and species too.

Every face is then split into its own corners (`facet`), so each triangle shows a flat colour. This gives the island's faceted, flat-shaded style.

Light and shade are **baked into vertex colour**:
- lighter on top and darker underneath;
- darker for clumps near the crown's centre.

So trees still read in overcast light, when the sun gives no shading. Each species keeps its own value band, so a mixed wood reads as mixed even in greyscale: dark pine, mid alder, light birch, silvery willow.

### One texture, many species: calibrated tints

All species share three textures: bark, needles and broadleaf, from the island's [surface recipes](../surface-catalog.md). Sharing keeps a whole forest to three materials. The vertex colour multiplies the texture, so to make birch bark white and pine bark orange we need a multiplier for each.

The first version divided the wanted colour by the recipe's middle swatch colour, and the foliage came out nearly black. The real texture was much darker on average than its swatch suggested. The fix is to bake each recipe once at low resolution, measure its true mean colour in linear light, and divide by that (`tint` in `tree-kit.ts`). The texture keeps its bark plates and needle detail, and the overall colour lands where the artist chose.

**Lesson:** calibrate against what the renderer actually draws, not against the inputs.

### Shrubs, fronds and deadwood

The same parts make other forms:
- **Mounds** (juniper, heather, bilberry) are clumps in an envelope. Low clumps sit toward the rim and tall ones near the middle. Stretch the clumps upward and raise their tops and you get a juniper flame; flatten them and you get a heather cushion.
- **Fronds** (bracken) are double-sided ribbons. Each one is an upright stipe then a nearly level blade, rising from separate points as real bracken does from its *rhizome*. The blade's width alternates along its length to suggest leaflets.
- **Snags and logs** reuse the tube with a ragged *cap* for a broken end, and stubby branches for snapped limbs. A log adds a root plate and moss on its upper side.

### Standing on a slope

A template is grown on level ground, but Highwood's plants stand on slopes up to about 65° ([`plant-seat.ts`](../../src/plant-seat.ts)). Placed at the ground under its centre, a plant's downhill side hung in the air: up to 0.55 m under an old Scots pine's root flare on a slope of 0.87, and more under the rim of a wide juniper ([#263](https://github.com/brylie/mission-island/issues/263)).
- **Trunks and snags** stand upright on the lowest ground under their base, sampled in 16 directions round the trunk's girth, and sink 8 cm more. Their uphill side runs into the hill, as soil banks against a real trunk on a slope (unsourced).
- **Shrubs** can't do that: a heather cushion 0.4 m tall would lose most of itself into the hill. Instead each is *sheared*: every point of the template rises by the slope times its offset, so its stems stay upright and its base follows the plane of the ground under three-quarters of its spread, as a heather mat lies on a bank (unsourced). The plane is lowered until no part of that ring stands below it. The shear stops at a slope of 0.7 (`maxShear`, about 35°): the Art Director found shrubs sheared further read as boards leaning on the cliff, their leaf texture stretched and a juniper's lower lobe pale and flat. Past it a shrub leans only so far, and its uphill side runs into the hill.
- **Too steep or broken.** A low mat under 0.6 m (`matHeightM`), heather and bilberry, is always planted: they hold steep banks (unsourced), and a mat that low barely shows being buried on its uphill side. A taller shrub whose base would be buried more than 35 cm (`shrubBuryM`), judged where the bake stores it, is left out of the planting bake: about 85 junipers on crags. Common juniper also grows as low, spreading mats on exposed ground ([Highwood's plants](../field-guide/highwood-plants.md#common-juniper-juniperus-communis)); the island has no prostrate form yet, so this is a simplification: a crag loses its juniper rather than growing a mat. A road draft previewed live re-checks burial too. Two stricter rules were tried first. Leaving out every shrub buried 35 cm dropped 484, on a median slope of 1.3 (52°), and the Art Director found Cairn's steep heath then read as bare rock; a limit as a share of each shrub's height dropped 1,600, as an ordinary hollow buries a heather cushion that much.
- **Bracken** rises from one crown, and **logs** follow the ground along their length, so neither changes.

A shear isn't a rotation, so normals carried by the same matrix tilt the wrong way, up to 35° under the steepest shear. The far merge carries each plant's normals by the inverse transpose of its matrix ([`plant-matrix.ts`](../../src/plant-matrix.ts)), and the near thin instances draw with copies of the tree materials that do the same in the vertex shader ([`sheared-normals.ts`](../../src/sheared-normals.ts)). Babylon's own non-uniform scaling flag doesn't help here: its thin-instance shader path ignores the flag and divides each normal by the squared lengths of the matrix's columns, which equals the inverse transpose only when the columns are at right angles, so a sheared shrub came out lit as if it stood upright (checked against `@babylonjs/core` 9.37.1; caught in review on #295). Seating a plant asks the ground 17 times, so each plant's matrix is worked out once and kept until the roads change, rather than every time a tile changes tier.

Tests (`test/plant-seat.test.mjs`) sample every planted base between the seat's own directions and hold it to the ground, with no tall shrub buried deeper than the limit, and check that a sheared shrub's matrix puts its base on its slope and tilts its upward normals with it.

### Age and exposure as visible traits

Every parameter is tied to something a player can see rather than to an abstract number:
- **Young** trees are conical and full to the ground.
- **Mature** trees self-prune their lower branches.
- **Old** trees grow stouter, with fewer, heavier forked limbs, root humps, and a flatter crown. Only some old trees have a snapped top: each species has its own chance, and willow never snaps.
- **Exposed** trees are shorter, lean downwind and flag.

A designer tunes a species by changing what they would describe in words. The *Natural Systems* review checked these against real growth. It caught, for instance, that young trunks had been given a larger radius ratio than mature ones, and that bracken was growing as a rosette like a fern, which it doesn't.

## Near and far: one tree at two distances

Each template comes in two tiers: a **near** model of about 600–1,500 triangles and a **far** silhouette of about 60–160. The far model keeps the main gesture with very few triangles. It's built from the same skeleton, then simplified:
- The trunk gets fewer sides.
- Only the two longest limbs are drawn.
- Each limb's clumps merge into a single mass.

The far tier took three attempts, and each failure taught something:

1. **Dropping small clumps** made distant crowns visibly thinner, and the switch "popped".
2. **Merging every small limb into the nearest kept mass** kept each crown's width.
3. **Single-ring masses** looked like diamonds; **two rings** fixed it, at the cost of raising the far budget from 120 to 160 triangles.

The masses are fitted to their group's true extent, flat bottoms included, so a far tree never floats or grows taller than its near self. Far masses are also slightly flatter and lighter in colour, the way distance flattens values in real air.

The [rendering page](rendering-and-detail.md) covers where to switch tiers and why budgets matter.

## Reviewing procedural art

The work went through three rounds of Art Director review, a Natural Systems review and a Game Architect review. These checks made the most difference:
- **Silhouette view.** Draw every species as a flat black shape against a pale sky. Colour hid that birch, alder and willow had become the same lollipop shape.
- **Several seeds side by side.** They should look like one species, never like copies, and never like a different species.
- **A tier switch at a fixed camera.** Flip between near and far without moving the camera, and look for changes in outline.
- **Measured acceptance checks.** "At least 40% of the trunk clear of foliage" can be checked on every seed. One good-looking seed in the viewport proves little.
- **A reference photo beside the model.** It's the art director's habit, built into the Workbench. See [Highwood species references](../highwood-species.md).

## Considerations and open problems

- **Seasons** are fixed in the templates today; [#211](https://github.com/brylie/mission-island/issues/211) plans runtime weights so a season doesn't multiply the template count.
- **Exposure** is binary; [#213](https://github.com/brylie/mission-island/issues/213) proposes a gradient.
- **Sway** isn't built. Each vertex already stores a sway weight in its colour alpha, from 0 at the ground to 1 at the top, ready for a later wind shader.
- **Determinism is a contract.** A golden test pins one template, so any change that would reroll the island's placed trees fails loudly.
