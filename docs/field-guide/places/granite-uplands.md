# Granite uplands

**Type: explanation (place). Real world: draft. On the island: in progress**, as the bare ground on Highwood's granite hills: Cairn Summit, Fallow Ridge and Windstone. Last tended 2026-11-23. Model purpose: **illustrate** a landform as ground texture. It uses its own headings rather than the framework's place shape. This page owns the granite weathering claims. The [island story](../../design/island-story.md#1-an-old-block-of-granite-and-sandstone) tells how the granite got there.

Climb a granite hill on Dartmoor, in the Cairngorms or on Arran and the ground changes as you go up. Turf and heather thin out. Grey rock breaks through in slabs crossed by straight cracks, and loose gravel and boulders lie below. Close up, the rock is speckled with crystals and patched with lichen. This page explains why granite looks like that, so the island's hills can look like it too.

## What granite is

Granite is a rock that cooled slowly from molten magma deep underground. Because it cooled slowly, its crystals had time to grow large: "Granites are composed of fairly large crystals" (`dnpa-geology-landforms-factsheet`). Most of them are quartz and feldspar, with darker mica. On a fresh face you can see the separate grains with the naked eye. Granite is often grey, white or pink (`geology-com-granite`, a tier-3 source; no tier-1 source checked yet ties the colour to feldspar).

## Joints: why granite breaks into blocks

When granite is uplifted and the rock above it wears away, it cracks. These cracks are called [joints](../glossary.md). Dartmoor's granite "generally displays both vertical and horizontal jointing" (`dnpa-geology-landforms-factsheet`). The flatter joints often follow the shape of the land, like the layers of an onion. In the Mojave Desert's granite, joints formed a rectangular grid (`nps-jotr-geologic-formations`).

Water gets into the joints and weathers the rock from both sides. Where joints are close together, the rock breaks down and wears away. Where they are far apart, solid blocks are left standing as [tors](../glossary.md): "Tors are a product of differential erosion determined by the spacing of the joints" (`dnpa-geology-landforms-factsheet`). In the Mojave Desert, sharp corners where joints meet weather first (`usgs-mojave-granitic-landforms`), which is why blocks end up rounded.

## Grus: granite that has turned to gravel

Weathering eventually loosens granite into its separate crystals. On Dartmoor this crumbly gravel is called growan: "The resultant gravel is called growan" (`dnpa-geology-landforms-factsheet`). Elsewhere it is called [grus](../glossary.md): "granitic sand ... found at the base of most outcrops" (`nps-ciro-geological-trail-1`). It is coarse and gritty, rich in quartz and feldspar (`usgs-mojave-granitic-landforms`, Mojave Desert). So a granite slope is often solid rock where it is steepest, and gravel and grit where it is gentler and the weathered material can stay put (an inference from the sources above; unsourced).

## Clitter: boulders on the slopes

In the cold stages of the Ice Age, water froze in the joints and prised blocks off the rock (`dnpa-geology-landforms-factsheet`). The blocks slid and tumbled downslope, leaving [clitter](../glossary.md): "boulders strewn across sloping ground, usually below tors" (`dnpa-tors-rocky-outcrops`). High granite plateaus such as the Cairngorms are boulder-strewn too (`bgs-understanding-cairngorms`).

## Lichen and stains

In clean, wet air, granite is rarely bare grey. A typical Dartmoor tor has "as many as 60 species of lichen covering much of the rock surface" (`dnpa-tors-rocky-outcrops`). Lichens on rock come in grey, green, yellow and orange (`nps-sapu-lichens`). They grow best where the air is clean, so they also show how clean it is (`nhm-lichens-toxic-air`). Dark streaks where water runs down a face are common too. The page doesn't yet have a source for what darkens them.

## In the game

Highwood's ground shader (`src/beach-material.ts`, numbers in `highwoodGranite` and `groundVariation` in `src/assets/geometry/starter-landscape.ts`) draws bare ground above about 7–15 m as granite. The baked slope decides how much bare rock shows ([island generation](../../design/island-generation.md#the-current-bake)). Within the rock:

- **Bedrock on the steepest ground.** Two sets of joints cut it into blocks. Long joints run along the axis of Cairn Summit's granite core, about 37° north of east, and shorter cross joints lean between them. Most cross joints and some long joints stay shut, so slabs run long. Each block tilts a little, so the faces catch the light differently.
- **Grus on gentler rock.** Gentler rocky ground is drawn as gritty sand with stones a few to twenty centimetres across scattered through it.
- **Crystals at true size.** The [granite surface](../../surface-catalog.md) texture shows grains about 16 mm across.
- **Lichen and blotches.** Pale grey-green lichen crusts and dark weathering blotches patch the faces.

The same noise that draws the joints and stones also tilts the lighting, so they catch low sun. The [rendering page](../../craft/rendering-and-detail.md#ground-that-doesnt-tile) explains how.

## Where the island differs

| Real | On the island | Why | What a player might wrongly learn |
| --- | --- | --- | --- |
| Tors and clitter boulders stand up from the ground. | Bedrock and grus are painted on the terrain, with lighting relief but no real height. Separate boulder props stand on the meadows. | The terrain mesh has a vertex every few metres, too coarse for blocks a metre wide. | That granite slopes are smooth. Scattered outcrop meshes are a follow-up. |
| Joints follow each granite body's own stresses. | One joint direction for all of Highwood, set by Cairn Summit's core. | One direction is enough to stop the pattern looking random. | That joints always run north-east. |
| Lichen species and colours vary with aspect, height and exposure. | One grey-green crust tint, placed by noise. | Not needed for play yet. | That all granite lichen is grey-green. |
| Dark streaks run down faces where water flows. | Dark blotches placed by noise, not stretched downslope. | Cheap. | That stains are random. |
| Grus is sand and grit of single crystals. | Grus is drawn with stones up to about 20 cm in it, larger than real grus grains. | Sand-sized grains would be invisible at walking height; the stones stand in for the clitter and broken blocks mixed in on real slopes. | That grus is cobbly. |
| Joints show on cliff faces too. | The joint and grus pattern is drawn from above (world x and z), so it stretches on steep faces. | Cheaper than drawing it from three sides. | Little. |
| Grus collects where slopes ease. | Grus is drawn wherever the rock is less steep, by slope alone. | The bake has no sediment layer for weathered rock. | Little. The pattern is right, but the reason is simplified. |

## Notice this

Find a granite boulder or wall. Are the crystals big enough to see? Do the cracks run in straight lines, and are there two directions that cross? What colours are the lichens, and which side of the rock has most?

## A resident might say

"Granite's tough, but give it ten thousand winters and it'll turn to grit under your boots."

## Sources

Source ids in the text point to the [sources register](../../sources.yaml).

**Unsourced, to add before this page leaves draft:**
- that granite cools slowly from magma deep underground, and that it holds mica;
- that granite cracks as it is uplifted and unloaded, and that flatter joints follow the land like the layers of an onion;
- that water weathers joints from both sides;
- that frost-loosened blocks slid and tumbled downslope;
- that granite in clean, wet air is rarely bare grey;
- that slopes are solid rock where steepest and grus where gentler (an inference, not a sourced claim);
- that the pink or grey colour comes from the feldspar (only a tier-3 source so far);
- that feldspar weathering is the chemical step that turns granite to grus;
- what causes the dark streaks on rock faces.
