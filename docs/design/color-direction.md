# Color direction

> Status: proposal. Nothing here has been seen in the game yet. Treat the families and ranges as a starting point, then confirm or change them with captures from the routes in [Review a color change](#review-a-color-change).

Color should help the crew know where they are and what they can do. A cream cottage wall, a teal dock shed and a red fire engine should each be recognizable from the island view, and the same cottage should still read as the same place at dawn, under rain and in autumn. That is the [creative direction](creative-direction.md) applied to color: *being useful in a place you know*.

Mission Island gets there with a few colors that are reused deliberately, a light that everything shares, and saturated color kept for the things a player needs to notice.

## What the island already does

An audit of the `#rrggbb` literals in `src/` (November 2026) found a palette that already works but has never been written down:

- **Soft and high-key.** World materials have a median OKLCH chroma of about 0.07. Almost nothing is darker than 24% lightness. Sand, straw and cream make up about 39% of all uses.
- **Signals stand out on their own.** The only colors above chroma 0.15 are the flatbed brake light, the fire-crew and vehicle reds, the fishing bobber and the aviation orange.
- **Off-family hues are people and flowers.** Violets, roses and bright blues come almost entirely from wardrobe dyes and foxgloves.
- **The same paint is retyped by hand.** 1,051 unique hexes in world code collapse to 385 colors you can tell apart, and to about 62 at a looser threshold. One cream has 20 near-identical versions across 13 files.

Some of those look-alikes do different jobs. A warm white can be a cottage wall, an eye highlight or the sun's color. Others are the same paint typed twice. The second kind costs coherence and performance: `meshes.paint(hex)` creates a material for each distinct hex and merges static meshes per material, so two identical creams become two materials and two draw calls.

## The system in six parts

| Part | What it covers | Owned by |
| --- | --- | --- |
| [Light and grade](#light-and-grade) | Sun, sky fill, fog, night light, exposure and any color grade | One shared lighting preset that hour and weather blend |
| [Land, water and sky](#land-water-and-sky) | Terrain, meadow, sand, sea, fresh water, sky | Surface recipes, the ocean shader and the atmosphere |
| [Material families](#material-families) | Named paints and finishes for buildings, props and vehicles | Named role constants |
| [Cloth and bloom](#cloth-and-bloom) | Wardrobe dyes, awnings, bunting, flowers | Wardrobe stock, cloth props and plant factories |
| [Signals](#signals) | Brake and hazard lights, emergency crews, the bobber, completion and interaction cues | A short reserved list |
| [Kept with their source](#kept-with-their-source) | Recipe stops, emissives, species, skin tones, state colors, UI | The system that draws them |

Interiors are not yet in the game. When they arrive, they should use the same families under their own light.

### Light and grade

Light ties the island's colors together. It's also where hour, weather and season change the look, so the materials don't need a palette per condition.

- Keep the sun, sky fill and atmosphere in one shared lighting preset, as `island-lighting` does on the code-quality branch. Hour and weather blend that preset; they don't swap it abruptly.
- If we add a grade, apply it in one place through the scene's image-processing configuration. Nothing in `src/` uses image processing yet. Adding a second image-processing pass on top of the sun-shaft post-process would wash out the frame.
- Start with mild contrast and curves. If a lookup table (LUT) comes later, it should pull hue and saturation gently and leave lightness alone, so the meadow's broad damp and dry patches survive.
- A direction to test: shadows lean slightly cool and highlights slightly warm, so a timber post and a teal shed share the same afternoon.

**Golden hour.** As the sun drops, the direct light deepens from gold to ember while the sky fill cools and softens, and the fog leans toward a warm haze. Sunlit walls go peach, then salmon, and shadows stay blue. Low sun keeps most of its strength on the surfaces that face it, so the key is lifted rather than dimmed with the sun's height. Rain mutes all of it, and below the horizon dusk and night take over unchanged. The curves live in `goldenHourPreset` (`src/assets/recipes/golden-hour.ts`). Dark conifers read olive in this light, which is physically honest. Rust and copper crowns come from lighter, yellower foliage and from autumn, which is a material and season question, not a lighting one. Never let a grade neutralize this light.

**Night.** Moonlight and sky fill stay cool and low. Window glow and lamp pools are warm emissives and are the main color after dark. Cottages and signals should still be recognizable by shape and light, not by their daytime paint.

**Weather.** Rain darkens and slightly saturates wet surfaces, and fog lowers contrast and saturation with distance. Both come from light and from material wetness, not from different paints.

**Seasons.** Color changes come from the things that actually change, as described in [island climates and seasons](climate-and-seasons.md): turning foliage, seed heads, bare deciduous crowns, greener conifers, frost on sheltered ground and low winter light. Painted structures keep their colors all year.

### Land, water and sky

Terrain, water and sky aren't paint. They come from surface recipes, the ocean shader and the atmosphere, which already vary color with habitat, depth and distance. Their base tints should sit near the families below so a cottage looks at home on its ground, but they don't use family constants.

- **Sea.** Depth and tide set the color, from shoal teal over sand to deeper blue-green offshore. A sea that reads the same everywhere loses the shallows the crew swims and fishes in.
- **Fresh water.** Mirror Pool should read as fresh: darker and greener at the reedy edge, clearer over the bottom, never as the sea.
- **Meadow and ground.** Broad color changes follow damp, drainage and exposure, as in [grass seen from a hill](creative-direction.md#grass-seen-from-a-hill).

### Material families

A family is a set of named roles for one kind of material. Choose the role before the hex: a new prop's door is `cottageCream`, not "a cream I picked". Two assets meant to share a paint share the constant. A model's own finishes stay with its geometry.

The roles below come from the look-alike groups in the audit. Each anchor is the central value among the flat mesh colors in its group (box, cylinder and paint calls only). These are proposals for review, not final values.

| Family | Roles | Seabrook anchor | Saltwind | Where it reads |
| --- | --- | --- | --- | --- |
| Cottage paint | cottage cream, warm white trim | `#ece5cf`, `#fff1c8` | `#f5e5c2` (`saltwindSceneryPalette.warmWhite`) | Walls, trim, panels, road and bay markings |
| Harbor straw | pale straw, rope tan | `#ecd3aa` | — | Thatch, rope, crates, sacks |
| Timber | light, mid and dark timber, tarred post | `#aa8562`, `#8b6746`, `#685647` | — | Props, docks, posts, barrows |
| Weathered wood | driftwood, weathered brown | `#85765e`, `#745d46` | — | Old boards, beach wood, sheds |
| Stone | harbor stone, slate | `#a39c86`, `#71857f` | `#8a9185` (`saltwindSceneryPalette.slateGrey`) | Walls, quays, quarry, kerbs |
| Harbor teal | dock teal, roof teal | `#798c82`, `#3f5d5a` | — | Sheds, roofs, boats, trim |
| Brick and rust | rust brick, barn red | `#a95239` | — | Brick, rusted steel, a barn |

Each island can keep its own values for a shared role, as Saltwind already does for cream and slate.

The current albedo range is chroma up to about 0.15 and lightness above about 0.24 (OKLCH). A value outside that range needs a reason in review. These are hex albedo values, not what the player sees after light and any grade are applied, so judge the result in captures.

- Steps meant to look different should be at least ΔE 0.04 apart in OKLab. That's a floor for walking distance. Roles that must read apart from the island view, such as a cottage wall and the market awning, need a clear lightness step, checked in captures.
- Colors closer than ΔE 0.02 look the same. If they share a role and a material path, they should be one constant.
- Variation should have a cause. Weathering, damp, salt, age and habitat belong in surface recipes and procedural controls, not in a retyped hex.

### Cloth and bloom

Cloth and flowers carry the brightest everyday color on the island. A player should recognize a crewmate by a dyed jacket, find the market by its striped awning, and know early summer by a foxglove bank. These colors can go past the material range on cloth, including awnings and bunting, and on plants. They never go on painted structure. Keep them below the signals in chroma.

#### Player dyes

> Proposal. The game doesn't offer dyes yet. Players choose named, authored garments, and the only free color picker is the Workbench's fabric dye.

Today's wardrobe already sits inside the cloth range. Across 52 garments, the main colors span lightness 0.40–0.94 (median 0.60) with chroma up to 0.157 (median 0.079). The brightest is the Fire crew uniform, which the crew earns. If we add dyes, they should keep that balance:

- **Dye the plain pieces, not the named ones.** A dye recolors the plain shirt and cap, the pieces the crew rig's `dye` option already reaches, as residents such as Mara use it today. Named shop pieces such as the Squid Slicker keep their authored colors, because their color, trim and motif are what make them recognizable. Each swatch carries its own trim on the rolled cuffs, buttons and cap brim.
- **Hue is the choice, and lightness comes in steps.** Generate the swatches in OKLCH at a fixed lightness and chroma per row, rotate the hue, and clamp the chroma to sRGB for each hue. Use three rows of eight hues rather than two of twelve. After silhouette, hair and hat, lightness carries recognition at a distance, at dusk and with color blindness. Two shirts at the same lightness, one red and one green, are the pair that fails. All three rows are offered from the start; earned uniforms remain the crew's rewards.
- **Commit the swatches as data.** A small script writes the swatch file once; nobody hand-tunes a single swatch. A check, if we add one, compares that file with its generator, not every color in the game.
- **No pure white or black.** Offer an off-white and a charcoal as swatches in their own right.
- **Preview on the avatar in the scene's light.** At the wardrobe, show the dye on the player at the current hour. Golden hour shifts a dyed shirt more than the step between two swatches, so a flat UI swatch would mislead.
- **Earned uniforms stay distinct.** No swatch reproduces an earned uniform's color and trim pair. Only the Fire crew also sits at signal chroma, and no dye reaches it.
- **Never hue alone.** Anything a player must act on pairs color with shape, an icon or a label.

**Draft values (tested November 2026).** Three rows at OKLCH lightness and chroma 0.87/0.08 (pale), 0.66/0.12 (mid) and 0.48/0.10 (deep), with hues at 31°, 76°, 121°, 166°, 211°, 256°, 301° and 346°. Each hue's chroma is clamped to 98% of the sRGB limit. Trim is derived, never tuned: pale and mid swatches take the deep step of the same hue, and deep swatches take the pale step. Off-white `#f5efe2` and charcoal `#2a2e33` complete the set.

| Row | Swatches |
| --- | --- |
| Pale | `#fec4b9` `#f3ce99` `#ccdda2` `#a1e6c8` `#94e3f2` `#bad7fe` `#dccafe` `#fcc0df` |
| Mid | `#d17464` `#bc872f` `#879d42` `#34a981` `#10a4b9` `#5f94da` `#9f80d0` `#c672a2` |
| Deep | `#8d4639` `#7d5405` `#55661b` `#076f51` `#076a78` `#355e95` `#674f8d` `#854469` |

What the checks showed (OKLab ΔE, with color vision simulated at full severity and light approximated from the game's hour curves):

- **Rows hold.** No two swatches from different rows come within 0.04 of each other in any vision type, at noon, golden hour or dusk. For deuteranopes that separation rests on lightness alone, and a deep shirt nearly merges with slate trousers into one dark column.
- **Within a row, hue alone is not enough at dusk or for color-blind players.** For normal vision the closest pair drops from about 0.05 in daylight to 0.03 at dusk. For deuteranopia, blue and violet in the same row look alike whatever the hue offset. Eight hues at one lightness can't all separate, so recognition rests on the row, the hat and the hair.
- **Skin needs the trim.** A pale row at lightness 0.80 put a peach shirt on top of the Light skin tone, so the pale row moved to 0.87. Even so, pale peach on Light skin and mid orange on Warm skin read as bare arms in the Workbench. The derived cuff fixes that: every trim sits at least 0.078 from every skin tone, and every shirt at least 0.18 from its own trim.
- **Nothing collides with uniforms, signals or buildings.** No dye and trim pair reproduces a uniform or everyday shirt, the highest dye chroma is 0.121 against 0.157 for the softest signal, and only the pale sand and mid leaf swatches sit near sand and grass (0.045 and 0.037).

Checked in the Workbench under the real hour: two crew from behind at 12:00, 17:30 and 18:15, where mid cornflower and mid heather stay apart for normal vision and merge for deuteranopes, as predicted. Still to check: after 19:00 and in rain, one crewmate walking off seen from the island view, the mid brick and ochre against Seabrook's salmon and amber cottage walls, pale ochre against off-white, off-white against Light skin, charcoal against dark hair and slate trousers, and the cap brim from the front. The rig's `dye` takes `{ color, trim }`; compare pairs in **Wardrobe → Dye lineup** in the Workbench, which uses the island's real hour. The cuff reads close up but is about a pixel at follow-camera distance, where the long sleeve does the separating.

### Signals

Reserve the most saturated colors for what a player has to notice or act on:

- brake and hazard lights
- emergency crews (fire, rescue)
- the fishing bobber
- aviation markings and the ridge course
- job-complete and interaction cues

No material, cloth or flower should match their chroma. When a new cue needs color, add it here first and check it against the rest of the scene from the island view.

### Kept with their source

Some colors look like family members but do a different job. Don't merge them into a family even when they match:

- **Surface recipe stops.** The spread inside each recipe's three colors is the weathering.
- **Emissive colors.** Lamps, window glow, beams and `paint(hex, true)`.
- **Light and atmosphere colors.** These belong to the lighting preset.
- **Species colors.** Gulls, oystercatchers, shells and fish follow their reference.
- **Skin tones and faces.** These follow the [crew character art](crew-character-art.md).
- **State colors.** Ash, wet soil, a repaired stage. Each shows progress and has to read as different.
- **UI and map canvas colors.** These belong to the interface, not the world.

## How it fits the code

- Named role constants live in data modules that hold only constants and types, as on the code-quality branch. Shared families sit in a module per island or a shared one. A model's own finishes stay beside its geometry.
- Merge look-alikes only within one role and one material path. Fewer distinct `paint` hexes also means fewer materials and draw calls. Measure that on the same route before and after.
- If we add a palette check, it should look at values passed as paint or albedo and compare them with the named families. It shouldn't scan every hex in a file, because the colors kept with their source would fail it.

## Not part of this direction

| Idea | Why not |
| --- | --- |
| Full-screen palette snapping or posterization | It removes the gradual color shifts the meadow and the sky rely on, and the retro crunch isn't the island's look |
| A strong LUT pull toward a fixed set | Same problem at a smaller scale. Keep any LUT mild and test it on the meadow first |
| Toon ramps or vertex-color-only materials | The surface recipes already carry grain and wear |
| Adopting another game's palette table | Seabrook's color should come from its own harbor, fields and weather. Use outside palettes only for comparison |

## Review a color change

Use the [Art Director skill](../../.agents/skills/mission-island-art-director/SKILL.md) and the shared [review workflow](../playtests/review-workflow.md). For a family change or a grade:

1. Save setup links before and after on Harbor Depot → Seabrook Market → Driftwood Beach, and at one Saltwind lot. Match the seed, quality setting and camera in each link.
2. Capture the island view and walking distance at each stop, at clear noon, overcast late afternoon, and dusk with lamps lit. For a grade, also capture the meadow from Windstone Ridge and one scene in rain.
3. Check that:
   - the market awning and the cottages still read apart
   - timber still shows grain and wear
   - no surface recipe loses texture
   - signals are the loudest color on screen
   - night emissives are unchanged
4. Compare draw calls and frame time on the same laptop and route.

Seasonal variants can't be reviewed until the game has a season control. Use a Workbench mockup and label it as one.

## Open questions

| Question | Evidence to collect |
| --- | --- |
| How many timber steps does the island need: three, or four with a tarred post? | Put the merged timbers side by side on the dock and the barrow at walking distance. Look for steps that disappear or ones that look like an accident |
| Should a grade use curves only, or curves plus a mild LUT for each hour? | Compare the meadow from Windstone Ridge with curves only and with a LUT at 15–25% strength |
| Which roles should differ between islands, beyond Saltwind's cream and slate? | Compare Seabrook and Saltwind cottages in matched light once both use named roles |
| How saturated can cloth be and still stay below the signals? | Put two crew in the brightest dyes next to the fire engine and the bobber, seen from the island view |
| Do the draft dye rows keep two crewmates recognizable in play? | The numbers and single-figure Workbench checks pass with derived trim (see [Player dyes](#player-dyes)). Put two crew in neighboring hues of one row, then of different rows, and have one walk away at the real 17:30 and dusk. Look from behind at follow-camera distance and from the island view |
