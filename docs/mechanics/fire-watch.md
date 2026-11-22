# Fire watch: stations, the tower and wildfires

**Playable.** After the starter shift, wildfires break out now and then somewhere on Starter Island. The crew finds each one from the Fire Watch tower or on foot, takes extinguishers from the red fire stations and puts it out before it spreads. The loop practices the parts of a search and rescue callout: spot it, fix its position, bring the right equipment and work together.

## Fire stations

Six red stands hold one extinguisher each, beside the routes the crew already uses:

| Station | Where |
| --- | --- |
| Harbor Depot | East of the depot crate stack, at about (−41.7, −15.6) |
| Seabrook | In front of the west house on the square, at about (32.5, 18) |
| Island Farm | Beside the fields, at about (26.4, −8.6) |
| Fire Watch | At the foot of the tower stairs, at about (25, 27.4) |
| Pinewoods | By the meadow slope path, at about (−29, 10.5) |
| Fire Supplies | The original two extinguishers, on the ground at (20–22, 22) |

Anyone can pick up an extinguisher at any time. A full one holds 16 seconds of spray at a fire. Spraying where it reaches no flames costs nothing. Near a fire, **Hold to spray · 62% left** in the prompt shows what remains. An empty one reads **Set empty extinguisher down · Refill at any fire station**. Near any station, **E** refills the held extinguisher. Set down by its own stand, it goes back on the stand full. At each dawn, every extinguisher left lying around is returned to its stand and refilled. A crewmate holding one keeps it.

## The Fire Watch tower

The tower stands beside Fire Supplies, north-east of the Forest Lookout, at (21, 36). Three switchback flights rise 7.2 m from the trail to an open cab. Rails line every flight and the deck, and a jump cannot clear them. On the deck the follow camera stays under the roof, so the player looks out through the open windows across the island.

The brass **fire finder** stands in the middle of the cab. **E · Sight the fire finder** gives the place name, a bearing, a compass direction and the rough distance of the current smoke, for example `Fire finder · Windstone meadow slope · 267° (west), about 40 m`. A repeat reading, and `No smoke in sight` when nothing burns, show only to the player who looked. The map marks north with an **N**.

## Wildfires

The host schedules each fire. The first comes 1 to 3 island days after the starter shift finishes, so a new crew meets one early. Each later fire comes 3 to 11 days after the previous one ends. An island day lasts 8 real minutes, so a crew playing steadily meets roughly one fire per island week and a brush blaze about once a month. A fire starts only between 08:00 and 17:00, at least two hours after the last shower, while at least one crewmate is connected and awake. Otherwise the start is retried every 30 seconds.

| Size | Hotspots | Pay | Chance |
| --- | --- | --- | --- |
| Spot fire | 1 | 3 coins | 55% |
| Grass fire | 3 | up to 6 coins | 33% |
| Brush blaze | 5 | up to 10 coins | 12% |

The site is one of six dry, grassy places: Pinewoods glade, Juniper Hollow scrub on the grove's west edge, Windstone meadow slope, Lookout ridge grass, Long Acre hedgerow and Driftwood shore meadow. Each hotspot has its own peak heat between 0.55 and 1. A fire starts with one hotspot burning. Left alone, a hotspot heats toward its peak, and 20 seconds after any hotspot reaches 70% of its peak another one catches. The wind decides which: the fire jumps to an unburnt hotspot within 5 m that lies downwind of a burning one, with a little seeded chance. From the tower, the smoke column leans the same way the fire will spread. Everyone sees `The fire spread at Windstone meadow slope · 2 hotspots burning`. Rain heavier than 0.35 cools every hotspot and stops the spread. While no crewmate is connected and awake, the fire holds still and its burnout clock waits.

1. **Smoke reported.** Every crewmate sees `Smoke reported · Climb the Fire Watch to find it`. The mission panel shows **Smoke reported** until someone finds the fire. A tall smoke column rises from the fire, so it can be seen from the tower or from high ground.
2. **Located.** The fire is located when someone sights the fire finder, comes within 8 m of a burning hotspot, or sprays it. Everyone sees where it is. An orange ring marks it on the ground and a ringed dot on the map, and the panel shows the bearing, the distance, the pay and how many hotspots are out. A market order the crew already took keeps the panel; the fire then shows in the notices and on the map.
3. **Put it out.** Holding left click within 5 m of a burning hotspot turns the sprayer toward the nearest one. One spray takes a hotspot from full heat to out in 6 seconds, and two crewmates spraying work twice as fast. A brush blaze needs more than one full extinguisher. When the last hotspot is out, the crew bank is paid once: the size's pay, less a coin for each hotspot that caught after the first, and never less than 1. Both screens show, for example, `+6 coins · Grass fire out at Windstone meadow slope · Crew bank`.
4. **Left alone.** A fire still burning after 1.5 island days of crew time burns itself out with no pay. One put out by rain also pays nothing.

A large fire takes more than one extinguisher. In a pair, one crewmate can climb the tower and call the bearing while the other heads for the nearest station. A solo player can do both, then refill at a station between hotspots.

## Wind, dry spells and burnt ground

- **Wind.** The island wind veers up to about 35° either side of the steady Windstone Ridge breeze over a few days, and freshens or eases. It is a pure function of island time, so the host and every screen agree without sending it. The ridge windsock and the glider still use the steady ridge breeze; the smoke column leans downwind of the current island wind. In light air, the nearest hotspot tends to catch; in a fresh wind, the downwind one does.
- **Dry spells.** Grass will not catch until two hours after a shower heavier than 0.35. After more than 12 dry hours, the scheduled fire comes early, by up to a day: 0.75 days earlier for each dry day beyond the first 12 hours.
- **Burnt ground.** The last fire leaves a scar over each hotspot that caught. Like the [Forest Lookout](../forest-lookout-recovery.md) verge, it is ash until the next dawn, shows shoots after the first dawn and grass and flowers after the third. Scars stay off footpaths, and each one grows back in its own pattern. A new fire replaces the old scar.
- **Wildlife.** Burning hotspots near Juniper Hollow count as visitors to the grove, so hares bolt from them and foxes keep their distance. Once the flames are out, the animals return to their usual foraging over the burnt ground.

## Ownership and restarts

The host owns the schedule, the active fire and each extinguisher's contents. The save keeps the next start time, the seed for the next draws, the burning fire with each hotspot's heat and its spread countdown, the last fire's outcome and which of its hotspots burned, and each extinguisher's remaining contents. Save version 7 adds the station extinguishers after the toolbox, so older item IDs stay the same, and starts the schedule fresh. A seed taken from the save keeps a reloaded island drawing the same next fire.

## Playtests

Run the `fire-watch` checkpoint: a grass fire burns on Windstone meadow slope on a morning that stays dry. The first crewmate stands at the foot of the tower stairs and the second by the Fire Watch station.

```sh
MISSION_ISLAND_CHECKPOINT=fire-watch MISSION_ISLAND_CREW_SIZE=2 npm run playtest
```

- **Ordinary:** climb the tower, sight the fire finder, then follow the bearing west with an extinguisher and put the fire out. Both players should see the same pay once.
- **Revealing:** wait without acting until a second hotspot catches and the pay drops, run one extinguisher dry, and refill it at the Pinewoods station.
- **Any fire:** press **O** and use **Playtest events** to end the current fire and start another. Choose the size, the site and the heat: a mild fire's hotspots peak in the lower half of the heat range and a fierce fire's in the upper half, so each fierce hotspot takes longer to spray out and burns with taller flames. Ending a fire leaves a burn scar, so the same menu sets up a scar to watch through the dawns.

The [wildfire tests](../../test/game-wildfire.test.mjs) cover the schedule, the finder, spraying and pay, burnout, refills, dawn restocking, restarts and the version 6 migration. The [Fire Watch tests](../../test/fire-watch.test.mjs) walk the stairs, check that the rails hold and that a crate set down on the deck rests there. Cargo physics, glider landings and dropped items use the tower's walking surfaces; the wheelbarrow stays off them. The **Fire Watch and wildfire** Workbench study shows the tower with a test fire of each size.

A live playtest with two human players is still pending.
