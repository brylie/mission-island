# Mission Island design

Mission Island is a two-player, third-person island game. Players can tackle shared service missions or spend a session fishing, tending the farm, and visiting Seabrook. The browser and LAN host give both players a short loop for building and playtesting together.

Start with the [design handbook](README.md) for the full documentation map. The [creative direction](design/creative-direction.md) describes the themes and inspirations behind these choices. [Crew progression](design/progression.md) follows them across several sessions.

## Feel and art direction

Aim for a quaint and comforting island. Give props generous shapes, warm colors, and a few recognizable details. A chest latch, a striped market awning, a rod bending toward a bobber, or carrot tops showing above the soil should tell players what they can do. From island view, preserve the compact toy-scale silhouettes and keep landmarks easy to read.

Ground the game in simple physical behavior. Crates have weight, boats drift after paddling, and the dock holds a player above the water. Keep recovery easy. Missed throws can be picked up, fishing attempts can be repeated, and crops grow while both players explore. Use shared meshes, simple geometry, and inexpensive motion for background life so the game stays responsive on the LAN.

## An inhabited island

Give each destination a detail that helps players infer who uses the place, what they do there, or how the landscape changes. At Shellglass a repaired tide staff faces the approach. At Mirror Lake someone put their basket at one end of the seat, leaving space for company. The surveyor’s mark at Tarnstep gives visitors a bearing they can still follow.

Design the approach as part of the place. Let players glimpse a distinctive shape, follow a worn route, then discover something smaller at walking distance. Leave room for two people to stop and look. Use wear, repairs, local plants and animal routines where they belong. During review, ask what a player could learn by looking around with the labels off and what would draw them back at another hour.

**Desire paths and animal trails** show repeated use. Where people leave a maintained route for a favorite destination, let the tread narrow, bend around obstacles, and fade where visitors spread out. At Driftwood, the narrow track fades into the dunes off the paved approach. The tide staff guides visitors across open sand to Shellglass. Beyond the dry rim, a short tread fades again and the sandstone fins guide the last few steps into Splitstone Narrows.

Animal trails follow a species’ routine. A hare might slip through a hedge between cover and a feeding patch, while ducks might leave a short, flattened run from reeds to water. Match the width, headroom and occasional tracks to the animal. Place those traces where players can also observe the behavior.

## Generativity

Use rules to produce variation in familiar places and activities. A ferry terminal should feel recognizable on every visit. Its surfaces, passing flocks, weather, and available work can change with the place, time, and crew's progress.

- **Materials and flora.** Generate textures and plant variations from traits people can see, such as stone grain, sand ripples, bark color, and branch density. Let habitat and terrain guide where plants grow and how they group.
- **Flocks and behavior.** Combine local behavior rules with habitat, time, weather, and, eventually, season. Fish school, move away from nearby players, and regroup. Day-active birds flock, land, and sleep in trees at night. Nocturnal wildlife gives the crew something to look for after dark. Villagers can follow recognizable daily routines with occasional changes that still let the crew find them.
- **Weather and phenomena.** Use the shared clock and weather to cue local changes. A morning fog can gather over Mirror Lake, and reeds can bend in the same passing gust. Keep routes and work sites readable through those changes.
- **Jobs and events.** Combine reusable job patterns with available cargo, reachable destinations, villagers, and crew unlocks. A market day might generate different pickup and return loads. Check that each offer has a route and equipment the crew can use, and keep its details stable once accepted.

Use repeatable seeds or saved outcomes for generated details that affect traversal or progression. The host owns shared conditions, events, and accepted orders so both players can resume the same situation after a reconnect. Use the Workbenches to compare seeds and conditions and replay a particular result during QA.

The Biome Composer models a small food web in isolation. Clover feeds hares, foxes pursue exposed hares, and tussocks and terrain features offer refuge. Rain changes shelter choices and available forage. A recipe records the ground surface, ingredient counts, weather, hour and placement seed. Designers can compare a single change at the same point on the timeline before adopting a recipe or a behavior on an island.

Juniper Hollow on Starter Island uses the Pine hollow recipe. Its seed sets the composition, with spacing adjusted for solid trunks and fallen wood on the hillside. The clearing follows the island clock and rainfall. Hares and foxes can cross fallen logs and low boulders up to 0.66 m high. They take detours around trunks, taller rocks, and long stretches of fallen wood. A hare startles within 3.8 m of a visitor and a fox breaks pursuit within 4.6 m. Both crew members see the same animals and remaining clover. Wildlife is ambient and starts a new simulation when the host restarts.

Use the [Natural Systems Reviewer skill](../.agents/skills/mission-island-natural-systems/SKILL.md) when a scene should respond through natural processes. Describe what a player should see, identify the local rule behind it, then compare a replay with one cause changed and retest across seeds.

## Play loops

- **Service shifts.** Work together to deliver harbor crates and put out the lookout fire. After the starter shift, the harbor board offers repeat deliveries to new destinations and market orders for fish and crops. Choosing an order leaves the crew in the world where they were already playing.
- **Island life.** Take tools from the chest outside your starting house. Fish from the shore, dock, or skiff, or use the shared farm to grow carrots. Sell your catch and crops at Seabrook Market.
- **Observation.** The crew shares one [field journal](mechanics/field-journal.md), a paper checklist with no camera. Landing a fish or walking into a place records it. Aiming at an animal, plant or landmark and pressing **E** records that. First records and new behaviors add to a shared tally, which is the crew's observation progress alongside its career paths. Each player's map still reveals a place only on their own visit.
- **Progression.** Farming, fishing, and truck deliveries provide the first income. Each starter crate earns two coins for the crew, with three more for finishing the delivery and four for clearing the lookout fire. Market earnings and crew pay go into one bank across both islands. Either player can buy seeds and the Harbor angler uniform. Service missions also unlock the delivery and fire uniforms. Completed orders count toward the shared second-island milestone independently of coin balances.

The [roadmap](roadmap.md) records the playtest ideas and future jobs.

## Mechanics

- [Inventory and starter chests](mechanics/inventory.md)
- [Charged throws](mechanics/throwing.md)
- [Fishing and cast timing](mechanics/fishing.md)
- [Farming and the market](mechanics/farming-and-market.md)
- [Crew orders and second-island progress](mechanics/crew-orders.md)
- [Neighbor repairs: Wren's gate](mechanics/neighbor-repairs.md)

Keep tuning values in the mechanic specification when they change. Update the mechanic's playtest cases when interaction rules or the multiplayer state change.
