# Mission Island product and game design

Mission Island is a third-person co-op game about **learning useful work together and making a home on an island**. Two people on separate browsers can load a truck, work a farm, or help with a rescue. They can also spend a quiet afternoon fishing, visit someone who remembers their help, or come home with a new entry in their shared field journal.

Design first for a child and adult playing together, or any pair with different experience and interests. Let them swap roles and continue a job solo if one player leaves. The browser and LAN host make it easy to join on separate computers. The island and the crew’s progress should be familiar when they return. [Design handbook](README.md) · [Playable features and roadmap](roadmap.md)

## Product priorities

| What players should get | What it means for Mission Island |
| --- | --- |
| **Work that feels physical and understandable** | Cargo has weight. Tools and vehicles have jobs they are suited for. Players can see why a load slipped or why a gate still catches, recover, and try a better approach. Simulate the parts of the work that change the player’s decisions. |
| **A reason to play together** | A solo player can load and drive. A pair can park accurately, spot a clear approach, prepare the load, and swap at the next stop. Both can see what the crew agreed to, who contributed, and what the job earned. The crew shares its bank, qualifications, and community projects. |
| **Careers that grow through practice** | A resident can demonstrate a skill, give the crew a safe chance to try it, and ask them to apply it in a different situation. A checkout earns a new responsibility. Tools, outfits, and vehicles belong to that work, such as a barrow for a larger order or a pump and hose for a later response. Field observation can grow into research and surveying. [Learning through island work](design/learning-and-careers.md) |
| **A community worth coming back to** | Villagers have routines and remember what the crew does. A repaired gate changes a route the next morning. Players choose their own appearance and workwear and can spend some earnings on ordinary life. Familiar habitats change with weather and seasons, giving the crew reasons to stay out or return. [Creative direction](design/creative-direction.md) |

## The session and the longer arc

1. **Choose what to do today.** A board order, neighbor, or place can suggest a next step. Keep one goal prominent. Leave room to grow food, buy something, explore, or spend the afternoon on the water.
2. **Do useful work.** Prepare equipment, take roles, travel, and solve the problem in front of you. A second player should have a way to make a difference and see the result. Show what happened in the world and on both screens.
3. **Make a life around the work.** Bring goods to market, spend or save the crew’s earnings, help a resident, and follow a clue into a habitat. Have something small to show for the day when the crew turns in.
4. **Earn the next responsibility.** Familiar work opens a more interesting job, trade, or equipment role. Contributions add up to a lasting local change, such as the rebuilt ferry wharf.

## When Starter Island feels complete

- **Day one works on its own.** Two players can join, choose roles, earn and understand their first shared pay, and decide how to spend the rest of the day. Both can find their way home.
- **There are several satisfying days before the wharf opens.** A delivery-led crew and a crew that prefers fishing and farming can both make meaningful progress. At least one local relationship deepens, one activity opens a new responsibility, and the wharf changes visibly over several visits. Test island week three or four as the opening target. [Story and cadence](design/starter-island-story-and-cadence.md) · [Milestone playtest #52](https://github.com/brylie/mission-island/issues/52)
- **Exploration fits between jobs.** A familiar route gives the crew a reason to take a detour, notice a different habitat, or return in changed conditions. The season or two spent here should produce both a memory of a place and a reason to return. [Starter Island biome plan](design/starter-island-biomes.md)
- **The day after opening is worth playing.** Each player can name something they would choose to do locally tomorrow. A crew can keep working, pursue a specialty, personalize their home life, or explore further. The ferry makes a new trip possible when they are ready.

Prioritize a complete job and its return visit. A new tool earns its place by changing a useful action or giving the partner a role. Gathering supplies can support a repair today and grow into a managed forestry or quarry job later. Keep updates understandable in the scene and test real actions before expanding an activity into another system. [First world-building route and materials direction](design/starter-island-worldbuilding-brief.md)

## Playful physics in a small first island

Take the practical puzzle-solving of Good Job! and the physical improvisation of Human Fall Flat into familiar island jobs. A crate tips at the flatbed rail. One player can steady it while the other moves the truck closer, or they can set it down and approach from the other side. Both should be able to see why it slipped and recover without losing the job. [Good Job!](https://www.nintendo.com/us/store/products/good-job-switch/) · [Human Fall Flat](https://store.steampowered.com/app/477160/Human_Fall_Flat/)

Some jobs should ask players to think. Give the crew a clear result to reach, a constraint they can see, and more than one workable approach. At a sloping delivery bay, the crew could line up on level ground and carry a crate the last few metres, or back in while a partner checks the approach. A solo player can walk the route and reposition the truck. Start with decisions about space, load and timing. Let the site and tools provide the clues, with a resident’s hint available if the crew gets stuck.

Start with the physical interactions players already use. Tune carrying, loading, terrain and support on one delivery route. Pair that route with a resident favor and an optional field-journal detour, then try the same outing solo and together. Record whether players understood the constraint, what they tried before asking for help, which mishaps led to another attempt, and what felt like waiting or busywork. Ask which action or job they would choose again after the payout.

Expand one loop when there is something specific to build on. If players enjoy arranging and recovering cargo, test a more awkward return load with the same truck, road and hand-in. If they spend most of the run wrestling the controls or waiting for their partner, improve that action or give each role more to do before adding equipment. Use the same approach for community and nature loops. A first outing should show what players would come back for before it grows into another career or a long chain of errands. [World-building handoff](design/starter-island-worldbuilding-brief.md) · [Shared review workflow](playtests/review-workflow.md)

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
