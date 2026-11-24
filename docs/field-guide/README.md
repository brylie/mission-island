# Mission Island field guide

The field guide is the real-world part of the project's [knowledge base](../README.md#learn-from-mission-island). The [craft pages](../craft/README.md) explain how the game simulates these subjects. Design decisions, mechanics and architecture have their own pages in the handbook.

The field guide records what we learn about the real world while building the island: species, habitats, landforms, weather, seasons, and the practical knowledge behind island work, such as first aid. Design docs say what we are building. This guide records **why the world looks and behaves the way it does**.

Different readers use it in different ways:

- **The team.** A designer, artist or reviewer can check a species' silhouette, where it grows, how it changes with the seasons, and which simplifications we chose.
- **Teachers, parents and students.** Each entry starts in plain language, and its *Notice this* prompt works as an observation activity, in the game or outdoors.
- **Researchers and scientists.** *In the game* says exactly what the island models, where the data lives, and what it simplifies, so the model can be checked or reused.
- **Players, later.** The [learning brief](../design/learning-and-careers.md) asks the game to "offer an optional journal or resident explanation when someone wants the real-world connection." The [field journal](../mechanics/field-journal.md) and resident conversations can draw on these entries.

## Pages

| Page | Covers |
| --- | --- |
| [Highwood plants](highwood-plants.md) | Trees, shrubs, groundcover and deadwood from the Highwood species generator |
| [Highwood habitats](highwood-habitats.md) | Pinewood, edges and gaps, heath and juniper scrub, the exposed ridge, wet woodland and bracken slopes |
| [Wildfire](processes/wildfire.md) | Process: how fire starts, spreads and is fought, why some land is burned on purpose, and how ground recovers |
| [Bracken slopes](places/bracken-slopes.md) | Place: how one fern takes over a hillside, and what that means for people and wildlife |
| [Granite uplands](places/granite-uplands.md) | Place: how granite cracks along joints into blocks and tors, weathers to grus gravel, and grows lichen |
| [Wet woodland](places/wet-woodland.md) | Place: alder and willow carr, trees that live with their roots in water |
| [Forest roads](practices/forest-roads.md) | Practice: how a road is fitted to a hill: grade, switchbacks, cut and fill, drainage and fords |
| [Spotting and ranging](practices/spotting-and-ranging.md) | Practice: how binoculars, laser rangefinders and compass bearings work, and how fire lookouts report a smoke |
| [Glossary](glossary.md) | Terms used in the guide, design docs and code, such as snag, root plate, whorl and phenology |

Related design pages: [Starter Island biome plan](../design/starter-island-biomes.md), [Island climates and seasons](../design/climate-and-seasons.md), and the [Highwood species references](../highwood-species.md) for Workbench photo comparisons.

## What an entry contains

Use these headings for a species. Adapt them for a habitat, landform, weather pattern or skill.

- **Recognise it.** The shape, colour and detail a player can see at walking and overlook distance.
- **Where it lives.** Habitat, soil, water, shelter, and what grows or lives alongside it.
- **How it changes.** With age, wind and exposure, and across the seasons, with months for the island's cool-temperate maritime climate.
- **Life around it.** Wildlife that depends on it, and how people have used it.
- **In the game.** What the island models, where it lives in the code or data, and what it simplifies or leaves out.
- **Notice this.** One observation a player could make and record in the field journal.
- **A resident might say.** One short line in plain language.
- **Sources.** Where the facts came from. Prefer a recognised conservation or scientific body, and mark anything uncertain.

Write in plain language that a curious twelve-year-old could follow, and introduce technical terms with a glossary link. Keep real-world facts and game choices apart, so a simplification is never taught as fact.

## When to add or update an entry

Update the guide in the same change that adds or alters something from the natural or practical world: a species, habitat, landform, weather behaviour, seasonal change, wildlife behaviour, or a skill such as first aid or knot-tying. The [Knowledge Keeper](../../.agents/skills/mission-island-knowledge-keeper/SKILL.md) checks for this in every [verify](../../.agents/skills/verify/SKILL.md) loop, and the other reviewers note knowledge worth keeping. When a review teaches us something we did not build yet, record it here anyway and link the follow-up issue.
