# Mission Island design

Mission Island is a two-player, third-person island game. Players can tackle shared service missions or spend a session fishing, tending the farm, and visiting Seabrook. The browser and LAN host give both players a short loop for building and playtesting together.

## Feel and art direction

Aim for a quaint and comforting island. Give props generous shapes, warm colors, and a few recognizable details. A chest latch, a striped market awning, a rod bending toward a bobber, or carrot tops showing above the soil should tell players what they can do. From island view, preserve the compact toy-scale silhouettes and keep landmarks easy to read.

Ground the game in simple physical behavior. Crates have weight, boats drift after paddling, and the dock holds a player above the water. Keep recovery easy. Missed throws can be picked up, fishing attempts can be repeated, and crops grow while both players explore. Use shared meshes, simple geometry, and inexpensive motion for background life so the game stays responsive on the LAN.

## An inhabited island

Give each destination a detail that helps players infer who uses the place, what they do there, or how the landscape changes. At Shellglass a repaired tide staff faces the approach. At Mirror Lake someone put their basket at one end of the seat, leaving space for company. The surveyor’s mark at Tarnstep gives visitors a bearing they can still follow.

Design the approach as part of the place. Let players glimpse a distinctive shape, follow a worn route, then discover something smaller at walking distance. Leave room for two people to stop and look. Use wear, repairs, local plants and animal routines where they belong. During review, ask what a player could learn by looking around with the labels off and what would draw them back at another hour.

**Desire paths and animal trails** show repeated use. Where people leave a maintained route for a favorite destination, let the tread narrow, bend around obstacles, and fade where visitors spread out. At Driftwood, the pavement reaches the beach and worn tracks branch toward Shellglass Tide Pool and Splitstone Narrows. The worn earth fades at the grass–sand boundary. From there, the tide pool and sandstone fins guide the last few steps across open sand.

Animal trails follow a species’ routine. A hare might slip through a hedge between cover and a feeding patch, while ducks might leave a short, flattened run from reeds to water. Match the width, headroom and occasional tracks to the animal. Place those traces where players can also observe the behavior.

## Generativity

Use rules to produce variation in familiar places and activities. A ferry terminal should feel recognizable on every visit. Its surfaces, passing flocks, weather, and available work can change with the place, time, and crew's progress.

- **Materials and flora.** Generate textures and plant variations from traits people can see, such as stone grain, sand ripples, bark color, and branch density. Let habitat and terrain guide where plants grow and how they group.
- **Flocks and behavior.** Combine local behavior rules with habitat, time, weather, and, eventually, season. Fish school, move away from nearby players, and regroup. Day-active birds flock, land, and sleep in trees at night. Nocturnal wildlife gives the crew something to look for after dark. Villagers can follow recognizable daily routines with occasional changes that still let the crew find them.
- **Weather and phenomena.** Use the shared clock and weather to cue local changes. A morning fog can gather over Mirror Lake, and reeds can bend in the same passing gust. Keep routes and work sites readable through those changes.
- **Jobs and events.** Combine reusable job patterns with available cargo, reachable destinations, villagers, and crew unlocks. A market day might generate different pickup and return loads. Check that each offer has a route and equipment the crew can use, and keep its details stable once accepted.

Use repeatable seeds or saved outcomes for generated details that affect traversal or progression. The host owns shared conditions, events, and accepted orders so both players can resume the same situation after a reconnect. Use the Workbenches to compare seeds and conditions and replay a particular result during QA.

## Play loops

- **Service shifts.** Work together to deliver harbor crates and put out the lookout fire. After the starter shift, the harbor board offers repeat deliveries to new destinations and market orders for fish and crops. Choosing an order leaves the crew in the world where they were already playing.
- **Island life.** Take tools from the chest outside your starting house. Fish from the shore, dock, or skiff, or use the shared farm to grow carrots. Sell your catch and crops at Seabrook Market.
- **Observation.** Either player can use the in-game camera to record fish, plants, wildlife, landmarks, and distinctive animal behaviors in a shared field journal. First records and new behaviors earn observation experience and count toward journal completion alongside the crew's career paths. [Island field journal](https://github.com/brylie/mission-island/issues/8)
- **Progression.** Farming, fishing, and truck deliveries provide the first income. Each starter crate earns two coins per crew member, with three more for finishing the delivery and four for clearing the lookout fire. Market earnings and crew pay buy seeds and the Harbor angler uniform. Service missions also unlock the delivery and fire uniforms. Completed orders count toward the shared second-island milestone independently of coin balances.

The [roadmap](roadmap.md) records the playtest ideas and future jobs.

## Mechanics

- [Inventory and starter chests](mechanics/inventory.md)
- [Charged throws](mechanics/throwing.md)
- [Fishing and cast timing](mechanics/fishing.md)
- [Farming and the market](mechanics/farming-and-market.md)
- [Crew orders and second-island progress](mechanics/crew-orders.md)

Keep tuning values in the mechanic specification when they change. Update the mechanic's playtest cases when interaction rules or the multiplayer state change.
