# Mission Island roadmap

This is the running record of ideas from the playtests. The [game design](game-design.md) and linked mechanic specifications describe the current rules.

The [Starter Island milestone](https://github.com/brylie/mission-island/milestone/4) connects the first payday, local relationships, a field outing, and ferry restoration. See [crew progression](design/progression.md) for the player journey and [design decisions](design/decisions.md) for the choices still open.

## Playable now

| Area | What to try |
| --- | --- |
| Co-op | Two browsers share a LAN host. Refresh to pick up development changes. Named saves retain the island and personal progress. |
| Early jobs | The starter shift leads into repeat jobs at the harbor board. Haul seed crates to Island Farm or gear to Driftwood Beach, and fill fish and carrot orders at Seabrook Market. Four completed orders mark the crew ready for the second island. |
| Neighbor favor | Wren's garden gate east of the Blue cottage drags in a groove. Borrow the toolbox from Wren's mending bench by the ferry approach, inspect the hinge, fetch a pin from the same bench, fit it and swing the gate. The crew is paid once and Wren takes the shortcut through the gate from the next morning. [Neighbor repairs](mechanics/neighbor-repairs.md) |
| Ridge gliding | Borrow the free hang-glider at the Windstone Ridge rack, fly the approach and land in the meadow circle to earn the crew's aviation qualification. Either player can then fly the Mirror Pool survey, then soar the island on ridge lift and daytime thermals to record an aerial survey of every place found on foot. A partner can mark the meadow from its sign. [Ridge gliding](mechanics/ridge-gliding.md) |
| Residents | Mara, Wren, Ines and Bram keep homes, walks and working hours on the shared clock. Each has a conversation and one favor: carrots for Mara, the gate for Wren, fish for Ines and a staged crate for Bram. Trust is shared per resident and rises once per kept favor. [Residents and favors](mechanics/resident-favors.md) |
| Crew | Use **Set name** in the crew panel or **Options → Name**. Names appear overhead. Characters blink and have selectable uniforms and skin tones. |
| Equipment | Each starting cottage has a private chest with a rod, hoe, watering can, and one starter carrot seed. Left click reaches, uses a tool, or charges a throw or cast. |
| Fishing | Cast from shore, a dock, or the skiff. Time the meter, then reel between pulls. Line tension can snap the line. Five named fish bite by hour, weather and water. |
| Field journal | Press **J** for the crew's shared paper checklist of fish, places and nature. Landing a fish or walking somewhere new ticks it off. Aim at an animal, plant or landmark and press **E** to record it. The journal and its tally survive a restart. [Field journal](mechanics/field-journal.md) |
| Farming | Till, plant bought seeds, water by hand or rain, and harvest after daylight growth. |
| Hauling | Walk up to the truck to board. Load physically simulated crates by hand or toss them over the bed lip. Side rails retain cargo during turns. Headlights, taillights, and nearby street lamps come on around dusk. |
| Movement | Sprint, jump, wade, and swim. Low rocks and crates support jumps. Reach the cab roof from the bed or hood. Respawn at home if stuck. |
| Skiff | Both seats can paddle. Buoys mark the 75 m offshore limit. A reconnect reservation follows the moving skiff. |
| Island | Explore towns, forest, beach, northern hills, wetlands, ridge, stream, and waterfall. Discoveries persist and their labels fade with distance. The overview and simplified minimap show landmarks and biomes. |
| Camera and weather | Mouse orbit, reticle, inversion options, close third-person and toy-scale island view. Shared eight-minute days bring rain, sunset rays, stars, and occasional meteors. Turn in at the cottages to reach dawn together. |
| Scenery and QA | Contoured roads and footpaths, gravel and pavement, coastline surf, naturally described material settings, fire and spray particles, and model previews. The Workbench checks overlapping geometry. The Landscape Workbench uses the real scenery and saves placement drafts. |

## Captured for later

- The [Living islands milestone](https://github.com/brylie/mission-island/milestone/2) applies [generativity](game-design.md#generativity) to biome placement, flora, fauna, and natural phenomena while giving each destination a recognizable identity.
- [Villagers](https://github.com/brylie/mission-island/issues/3) can grow from the playable cast: breaches and amends, more roles once their buildings exist, indoor evenings in [#128](https://github.com/brylie/mission-island/issues/128) and visitors by ferry.
- [Community projects and ferry dock restoration](https://github.com/brylie/mission-island/issues/4) give the crew lasting changes to work toward. The planned terminal belongs at the end of Harbor Depot road. Completing its repair restores ferry service in the Starter Island milestone. The existing dock serves small fishing vessels.
- [Rotating Harbor Job Board orders](https://github.com/brylie/mission-island/issues/5) bring a mix of short errands and longer outings. An accepted order stays available until the crew finishes it.
- [Co-op cargo handling and loading](https://github.com/brylie/mission-island/issues/6) gives players jobs at both ends of an awkward load or lets one spot while the other backs the truck in.
- [Shared map pins](https://github.com/brylie/mission-island/issues/7) let either player mark places for the crew on the overview and minimap.
- The [field journal](mechanics/field-journal.md) can grow with more species, more behaviors, client-only wildlife such as the day flock and night bats, and Saltwind's places. Its tally can later earn rewards alongside [career progress](https://github.com/brylie/mission-island/issues/18). It stays a checklist: a camera and stored photos are not planned.
- [Shared seasons](https://github.com/brylie/mission-island/issues/32) change familiar habitats and give crews reasons to return for seasonal sightings or gatherings. Start with a matched Pinewoods comparison and a crew calendar on Starter Island. [Climate and season design](design/climate-and-seasons.md)
- [Village market days](https://github.com/brylie/mission-island/issues/9) bring villagers to Seabrook Market for special orders and conversations.
- Give the shovel, pickaxe, and axe usable jobs. Start with buried finds, marked rock deposits, and fallen branches.
- Add more crops, sale goods, outfits, trade jobs, and practical upgrades for coins. Expand beyond the initial farming, fishing, and delivery work.
- Build a pump-equipped fire truck and a two-person firefighting job. Use separate roles for staging equipment, driving, and operating the pump. [Shared driving and vehicle equipment](architecture.md#flatbed-and-future-fire-truck)
- Add rescue work on land and water, including animal rescues, buoy service, and dedicated rescue boats.
- Add airplanes and helicopters with an airstrip, landing areas, and cooperative missions. Keep the exterior boarding and chase camera.
- Refine flora, wildlife, scenery, terrain, character movement, and close-up model detail as each new job needs them. Keep the gentle palette, clear silhouettes, and readable scale.
- Use Babylon material and particle authoring tools where they help refine the texture gallery, water, spark and smoke effects, and environmental details.
- Expand the Landscape Workbench from draft testing into more detailed map authoring as placement needs become clearer.
