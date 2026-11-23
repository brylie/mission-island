# Highwood plants

The Highwood is the planned north-west backcountry of Starter Island. It is modelled on the native pinewoods, heaths and wet woodland of a cool-temperate maritime island, much like the Scottish Highlands and islands. Every plant here is grown by the [Highwood species generator](../workbench.md#compare-highwood-tree-species). For where each one grows, see [Highwood habitats](highwood-habitats.md). Terms in *italics* are in the [glossary](glossary.md).

Each species is a table in `src/assets/geometry/tree-species.ts` or `src/assets/geometry/shrub-species.ts`, and the [Highwood species references](../highwood-species.md) open it in the Workbench beside a licensed photo. The game grows each plant at three ages (young, mature and old), sheltered or exposed to the wind, and from a seed that varies its shape.

**Not yet modelled for any species:**

- **Seasons.** Berries, flowers and autumn colour are fixed by age for now. See [#211](https://github.com/brylie/mission-island/issues/211).
- **Gradual exposure.** Wind exposure has only two levels. See [#213](https://github.com/brylie/mission-island/issues/213).

## Trees

### Scots pine (*Pinus sylvestris*)

**Recognise it**
- **Shape.** A tall, straight trunk, bare for much of its height.
- **Bark.** Thick, grey-brown plates on the lower trunk; thin, flaking, orange to salmon-red bark higher up. The orange upper trunk is the easiest way to tell it from other conifers at a distance.
- **Needles.** Grow in pairs, a few centimetres long, blue-green and slightly twisted.
- **Crown.** Young pines are cone-shaped. Mature and old pines carry separate, flat-bottomed pads of foliage with sky between them. Very old trees often become broad and flat-topped.

**Where it lives**
- The tree of native Caledonian pinewood. It grows on poor, acid, free-draining soils and in rocky ground, with heather, bilberry and juniper beneath.
- It needs light to regenerate. Seedlings grow in gaps, at woodland edges and on open heath, rarely in the shade of their parents. Where deer numbers are high, grazing can prevent regeneration.

**How it changes**
- **Self-pruning.** In a stand, lower branches die and fall as the crown rises toward the light.
- **Wind.** On exposed ground pines grow shorter and lean downwind. Windward branches stay short or die, so the crown streams to the lee side.
- **Age.** Very old "granny pines" have heavy limbs, broken tops and wide crowns. Scots pine can live for several centuries.
- **Cones** take about two years to ripen.

**Life around it.** Red squirrels and crossbills feed on the seeds. Wood ants build mounds of needles. Woodpeckers and many insects use old and dead pines.

**In the game**
- `scotsPine` in `tree-species.ts`, with whorled branches, a bare lower trunk and an orange bark transition.
- Exposed forms flatten, lean and stream toward +x. Old trees may snap at the top (25% chance per seed) and flatten their crowns.
- **Simplified:** needles and cones aren't modelled; foliage pads stand in for clusters of shoots.
- **Pine sapling** (`pineSapling`) is a small pine with a low, full crown.
- Placement puts young pines and pine saplings at edges, in gaps and on open heath, not under the closed pinewood canopy. See [the forest](../backcountry.md#forest).

**Notice this:** compare a pine in the middle of the wood with one on the ridge. Which way does the ridge pine lean, and which side lost its branches?

**A resident might say:** "Orange at the top, grey at the bottom: that's how you spot a Scots pine across the glen."

### Silver birch (*Betula pendula*)

**Recognise it**
- **Bark.** White and papery, with dark diamond-shaped marks that grow into rough, black, fissured bark near the base.
- **Twigs.** Slender and drooping, which gives the crown a light, weeping look.
- **Leaves.** Small and triangular, with toothed edges.
- **Flowers.** Catkins in spring.

**Where it lives**
- A *pioneer species*: its tiny winged seeds blow onto open and disturbed ground, and it grows fast.
- It prefers drier, lighter soils. Downy birch (*Betula pubescens*), with hairy, more upright twigs and duller bark, takes the wetter ground; it is a planned follow-up, [#212](https://github.com/brylie/mission-island/issues/212).

**How it changes**
- A birch often grows several stems from one base.
- It is relatively short-lived for a tree, typically around 80 to 100 years, and gives way to longer-lived trees such as pine as a wood matures.
- Leaves turn yellow in autumn.

**Life around it.** Hundreds of insect species feed on birch. Fly agaric toadstools grow with its roots, and the birch polypore bracket fungus grows on dead birch.

**In the game**
- `birch` in `tree-species.ts`. The crown starts high on a slender pale trunk, with clumps hanging below arching limbs.
- It has one to three stems, and seeds vary in dark bark marks.
- **Birch sapling** (`birchSapling`) is a single slender stem with a few small clumps.

**Notice this:** count the stems at the base of a birch. Is it one tree or several sharing a root?

**A resident might say:** "Birch is first in after a fire or a felling. Give it fifty years and the pines catch up."

### Aspen (*Populus tremula*)

**Recognise it**
- **Leaves.** Rounded, on long, flattened stalks, so they flutter and rustle in the lightest breeze. This gives the tree its Latin name.
- **Bark.** Smooth, pale grey-green, with dark diamond marks.
- **Crown.** A small, rounded crown set high on a straight trunk.

**Where it lives**
- Aspen spreads mostly from its roots. One tree sends up *suckers*, so a patch of aspen is often a single *clonal stand* of stems sharing one root system.
- Clones are usually all male or all female, and in Scotland aspen rarely sets seed.

**How it changes.** A whole clone turns yellow together in autumn, so a clone can be picked out as one patch of colour.

**Life around it.** Aspen supports rare insects and fungi, including the aspen hoverfly in Scotland, which depends on decaying aspen wood.

**In the game**
- `aspen` in `tree-species.ts`: one straight stem with a small, high crown.
- **Simplified:** each template is one stem, and the trees aren't linked. Placement mixes aspen into birch stands by weight, about three canopy trees in ten there, but doesn't yet group aspens into clone-like patches.

**Notice this:** stand under an aspen on a still day and listen. You can often hear the leaves moving when you can't feel any wind.

**A resident might say:** "That whole patch of aspen is one tree underground. Cut one and ten more come up."

### Rowan (*Sorbus aucuparia*)

**Recognise it**
- **Leaves.** *Pinnate*, made of many paired leaflets, which gives the crown a feathery look.
- **Flowers and berries.** Flat clusters of creamy flowers in late spring, then bright red berries from late summer into autumn.
- **Bark.** Smooth and silver-grey.
- **Shape.** A small tree, often with more than one stem.

**Where it lives**
- Rowan grows higher up hills than most trees, and on rocky ledges and crags where its seeds were dropped by birds.
- It is often called "mountain ash" because its leaves look like ash leaves, but it is not related to ash.

**How it changes.** Flowers come in late spring, berries ripen from about August, and birds may strip a tree within days.

**Life around it.** Thrushes, blackbirds and, in winter, redwings and fieldfares eat the berries, then spread the seeds in their droppings.

**In the game**
- `rowan` in `tree-species.ts`: one to three stems with a rounded crown.
- Mature and old trees carry small red berry clusters all year until seasons arrive ([#211](https://github.com/brylie/mission-island/issues/211)).

**Notice this:** look for rowans growing from cracks in rock or at the tops of old stumps, places only a bird could have planted them.

**A resident might say:** "When the rowan berries go, the thrushes have found them. Winter's on its way."

### Alder (*Alnus glutinosa*)

**Recognise it**
- **Shape.** A dense, dark, conical-to-rounded crown on a straight trunk, often with several stems.
- **Bark.** Dark and fissured.
- **Leaves.** Rounded, often with a notched tip.
- **Catkins.** Small woody cone-like catkins hang on through winter.

**Where it lives**
- Wet ground: riverbanks, loch shores and *carr* (wet woodland).
- Its roots hold nodules with bacteria that *fix nitrogen* from the air, so alder can grow on poor, waterlogged soil and enriches it.

**How it changes.** Alder holds its leaves late into autumn, and they often fall still green.

**Life around it.**
- Siskins and redpolls feed on the seeds in winter.
- Alder roots help hold stream banks together.
- Alder wood lasts a long time when kept wet, and was used for piles and sluices.

**In the game.** `alder` in `tree-species.ts`, with overlapping clumps stacked into a cone along a leader. It belongs beside Mirror Pool and the Fernfall stream.

**Notice this:** follow a stream and see where the alders stop. Their edge often marks how far the wet ground reaches.

**A resident might say:** "Where you see alder, mind your boots. It never grows far from water."

### Grey willow (*Salix cinerea*)

**Recognise it**
- **Shape.** A shrubby tree with many stems rising from the base into a wide, soft, rounded mass.
- **Leaves.** Grey-green, with soft hairs underneath that give a silvery sheen.
- **Catkins.** Furry catkins open in early spring, before the leaves.

**Where it lives.** Wet ground, ditches and the edges of pools and marshes, often with alder.

**How it changes.**
- Catkins come in March and April.
- Willows grow back readily from cut stems.
- Willows hybridise easily with each other.

**Life around it.** Willow catkins are one of the first big sources of pollen and nectar for bumblebees in spring.

**In the game.** `willow` in `tree-species.ts`: two to four stems fanning out under a wide, low mound. Willow never gets a broken top when old.

**Notice this:** in early spring, watch a flowering willow on a sunny day and count the bees.

**A resident might say:** "First food of the year for the bees, those willow catkins."

## Deadwood

### Standing dead pine (snag)

**Recognise it**
- **Shape.** A dead tree still standing: a *snag*. The bark falls away and the bare wood weathers to silver-grey.
- **Branches.** The branches break back to short stubs, and the top often snaps.

**Where it lives.** Anywhere trees die standing: from age, drought, disease, fire or being bark stripped by deer or squirrels.

**How it changes.** A snag can stand for decades, slowly softening from the outside in, until it falls and becomes *deadfall*.

**Life around it.** Snags are some of the richest habitat in a wood:
- Woodpeckers carve nest holes that owls, bats and tits later reuse.
- Beetle larvae tunnel the soft wood.
- Fungi break it down.

**In the game**
- `pineSnag` in `shrub-species.ts`. It has the girth of the mature pine it was, bleached wood above a band of remaining bark, broken stubs and a jagged top.
- Young snags (recently dead) keep more bark and limbs.

**Notice this:** look for neat round holes high on a snag. Something has nested there.

**A resident might say:** "Leave the dead ones standing if they're safe. Half the birds in the wood need them."

### Deadfall log

**Recognise it**
- **Shape.** A fallen trunk with its torn *root plate* standing up at one end.
- **Ground.** A pit where the roots pulled out of the ground.
- **Moss.** Moss creeps over the upper surface with age.

**Where it lives.** Trees on shallow or wet soil, or on exposed ground, are blown over in storms: *windthrow*. Fallen trees mostly point downwind, away from the storm.

**How it changes.**
- The log slowly sinks, softens and grows moss.
- Seedlings often root on the log itself or on the mound of soil the roots lifted.
- The pit and mound it leaves can shape the ground for centuries.

**Life around it.** Beetles, fungi, mosses, slime moulds, slugs, wrens and wood mice all use deadfall.

**In the game**
- `deadfallLog` in `shrub-species.ts`. It lies along +x with the root plate at the origin.
- Young logs are long, stout and bark-covered. Mature logs are shorter, sunken and mossy.
- Placement lays each log along the contour, either way along it, and tilts it to follow the ground from its root to its far end. Ground that bulges or dips more than 0.15 m from that line under a 7 m log is rejected, so logs rest on the ground rather than bridge hollows. There is no root pit yet.

**Divergence:** real windthrow mostly points downwind, away from the storm. The island lays logs across the slope instead, so they rest on the ground, and they don't agree on a storm direction. A player shouldn't read the wind from island logs. Whether real logs on slopes come to rest across the slope is an [open question](../open-questions.md#sources-to-find).

**Notice this:** check the direction of several fallen trees in one place. Do they agree on where the big storm came from?

**A resident might say:** "Every one of those fallen pines points the same way. That was the January gale."

## Shrubs and groundcover

### Common juniper (*Juniperus communis*)

**Recognise it**
- **Needles.** Sharp and grow in threes, with a pale band on the upper side, so the bush looks blue-green.
- **Shape.** Juniper ranges from narrow upright columns to low, spreading mats on exposed ground.
- **Berries.** The "berries" are fleshy cones that take two to three years to ripen from green to blue-black.

**Where it lives**
- Heath, open pinewood and rocky slopes.
- It needs open, light ground to regenerate, so it has declined where land has become overgrown or heavily grazed.

**How it changes**
- Juniper is one of only three conifers native to Britain.
- Plants are either male or female (*dioecious*), and only females carry berries.

**Life around it.** Birds eat and spread the berries. The dense, prickly bush shelters small birds and mammals.

**In the game**
- `juniper` in `shrub-species.ts`. Sheltered plants are flame-shaped columns or spreading vases; the 45% vase share is a game setting, not a field figure. Exposed plants are low and streamed downwind.
- Juniper is soft cover: players and animals pass through it.
- **Not yet modelled:** berries on female plants ([#211](https://github.com/brylie/mission-island/issues/211)).

**Notice this:** compare a juniper in a sheltered hollow with one on the ridge. Same species, different shape.

**A resident might say:** "Juniper used to be everywhere on these hills. Now we count the bushes."

### Heather (*Calluna vulgaris*)

**Recognise it**
- **Shape.** A low, woody shrub forming cushions, with tiny scale-like leaves.
- **Flowers.** Pale purple to pink flowers from late summer turn whole hillsides purple. Its other common name is ling.

**Where it lives.** Acid, poor soils on moor, heath and open pinewood.

**How it changes**
- Heather plants go through a life cycle: pioneer, building, mature and degenerate.
- In the degenerate phase, after roughly 25 to 30 years (an approximate figure that varies with site), the bush opens out in the middle into a ring.
- On many moors, heather is burned or cut in small patches to keep it young.
- It flowers in August and September.

**Life around it.** Heather feeds grouse and deer, and its flowers are a major late-summer nectar source; heather honey is prized.

**In the game**
- `heather` in `shrub-species.ts`: a low, purple-brown cushion of clumps whose tops flower purple on mature plants.
- **Not yet modelled:** the open-centred old phase ([#214](https://github.com/brylie/mission-island/issues/214)).

**Notice this:** look for a heather bush with a gap in the middle. It is an old plant.

**A resident might say:** "When the heather's out, the whole hill hums with bees."

### Bilberry (*Vaccinium myrtillus*)

**Recognise it**
- **Shape.** A small shrub with bright green, angular stems that stay green in winter after the leaves fall.
- **Leaves.** Small, oval and finely toothed.
- **Flowers and berries.** Pinkish, lantern-shaped flowers in spring, then dark blue berries.

**Where it lives.** The ground layer of pinewoods and birchwoods, and heaths, on acid soils, in light shade.

**How it changes.**
- Berries ripen from about July to September.
- Bilberry is deciduous, but its green stems keep the plant visible in winter.

**Life around it.** Birds, foxes, badgers and people eat the berries. Capercaillie and grouse chicks feed on the insects that live on it.

**In the game**
- `bilberry` in `shrub-species.ts`: a bright green mound.
- Mature plants carry small dark berries, which will become seasonal ([#211](https://github.com/brylie/mission-island/issues/211)).

**Notice this:** look for bilberry under pines where light reaches the ground, and see where it stops in deep shade.

**A resident might say:** "Purple fingers in August means somebody's found the bilberries."

### Bracken (*Pteridium aquilinum*)

**Recognise it**
- **Shape.** A large fern. Each frond rises singly on an upright stalk (the stipe), then spreads a broad, triangular, finely divided blade almost level with the ground.
- **Spring growth.** Fronds unroll as curled *croziers*, or fiddleheads.

**Where it lives**
- Deeper, well-drained soils on hillsides, in woodland gaps and on old pasture.
- It spreads by underground *rhizomes*, forming dense stands that shade out other plants.

**How it changes.** Green from early summer, turning bronze in autumn. The dead brown fronds lie flattened through winter.

**Life around it.**
- Bracken is poisonous to livestock.
- Its stands are where ticks are often picked up, so tuck in your trousers.
- Its spread is a long-standing problem for hill farms.

**In the game**
- `bracken` in `shrub-species.ts`: a small patch of single fronds rising from points up to half a metre apart, with tips turning from rust-green toward bronze.
- Bracken is soft cover.
- **Simplified:** spring croziers and dead winter fronds aren't modelled yet ([#211](https://github.com/brylie/mission-island/issues/211)).

**Notice this:** look at how far apart the fronds in a patch stand. Each one rises on its own, yet they may all grow from the same underground stem.

**A resident might say:** "Check your legs for ticks after walking through bracken."

## Sources

These entries draw on:
- NatureScot's [Caledonian pinewood profile](https://www.nature.scot/landscapes-and-habitats/habitat-types/woodland-habitats/caledonian-pinewood)
- the Woodland Trust's [A–Z of British trees](https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/)
- the Natural Systems review of [#196](https://github.com/brylie/mission-island/pull/196), summarised here; the full review notes are not published

Before quoting a figure in game text, check it against a species-specific source, such as a lifespan or a flowering month. Months are for a cool-temperate maritime climate and shift with latitude and altitude.
