# Mission Island architecture

The LAN host owns gameplay state, including movement, crew membership, orders, the shared bank, and saved progress. The game client renders host snapshots and sends player input. The Workbench and Saltwind preview run local sessions and can reuse mechanics and assets.

## Where changes belong

| Area | Responsibility |
| --- | --- |
| [Host simulation](../server/game.ts) | Sequences each tick, routes typed crew commands, and exposes snapshots. Crew reservations, purchases and payouts, held equipment, and interactions live in their feature modules under `server/`. |
| [Host adapters](../server/multiplayer.ts) | Vite wiring, LAN invite and bank endpoints, timers, and save scheduling. [Socket sessions](../server/socket-sessions.ts) handle WebSocket framing, timeouts, and snapshot backpressure. [Save storage](../server/save.ts) handles file I/O, validation, and migration. |
| [Shared simulation](../src/simulation/) | Movement, fishing, [ridge flight](../src/simulation/ridge-flight.ts) and Cannon physics that can run on the host or in a browser preview. Keep these modules independent of DOM, Babylon, and host adapters. |
| [World data](../src/worlds/) | Island-specific placement and collision definitions. Starter Island site placements and colliders live under `src/worlds/starter/`. Terrain, routes and other existing Starter Island rules still live in `src/`. Saltwind's sites, routes, terrain and tour are already split under [its preview](../src/second-island/). |
| [Assets](../src/assets/) | Reusable procedural models and their poses. Add models alongside their asset family, such as crew, buildings, flatbed, props, routes, or waterfront. Keep placement coordinates with the world that uses the model. Keep source meshes, textures and audio with their asset family and import them through Vite. Use `public/` for files that require a stable, unprocessed URL. |
| [Presentation](../src/scene.ts) | The game, Workbench, and Saltwind entry points wire browser input, views and rendering. Keep components and preview studies in feature modules. The [Workbench catalog](../src/workbench/catalog.ts) assembles studies in display order. |

## How to add a feature

Use the [Game Architect skill](../.agents/skills/mission-island-game-architect/SKILL.md) to trace a feature through its owners, decide what is worth sharing, and review the co-op and save behavior it depends on.

- Give each module a specific responsibility and a small public interface. Keep an entry point focused on composition. When a feature adds substantial branching, state or lifecycle code, put it in the owning feature module and pass only the state or callbacks it needs.
- Keep tick order and transaction boundaries visible. A change to command timing, a checkpoint, or the order of movement, equipment, and physics can affect play and reconnects. Cover those cases through the host integration tests.
- Share browser-safe rules through feature modules. Keep protocol changes focused on fields that cross the connection. Treat saved records and public Workbench subject IDs as compatibility contracts. Update validation and migration tests when a saved format changes.
- Organize world changes by island and by site, region, or system as the content grows. Give placements stable IDs, and record which geometry affects walking, cargo, or navigation. Aim to feed render and collision builders from the same placement data. When geometry depends on shared progress, such as Wren's gate leaf or the ferry barrier and deck, derive the solids from the snapshot in one rules module. The host places the matching physics bodies each tick, and walking reads the same solids as an extra surface. Keep Babylon mesh construction and batching in the presentation layer.
- Add regression cases to the matching `test/game-*.test.mjs` suite. The [game test harness](../test/support/game-harness.mjs) supplies fake sockets, an injected clock, and save fixtures. Use the smallest suite that exercises the feature's actual entry point.

## Composing behavior with traits

A trait is a capability or characteristic described by a small, typed piece of data. An entity definition combines the traits that apply to it. A shared system reads each trait and implements its behavior. Add traits when they describe behavior that multiple entities can use, or when an optional capability needs a clear owner.

| Responsibility | Where it belongs |
| --- | --- |
| Definition | Keep reusable tuning and geometry with the entity family. A trait can describe drive parameters, a threat detection range, or a plant's moisture requirements. |
| Behavior | Keep the rules in the system that uses the trait. Shared mechanics can run on the host and in the Workbench. The host owns changes that affect multiplayer gameplay. |
| Instance state | Give placed entities stable IDs when gameplay needs to refer to them. Keep changing values, such as speed or remaining forage, with the instance. Send or save the values that clients need to render or that a restart must restore. |
| Appearance and placement | Keep models and visual effects in the asset and presentation layers. Keep each island's spawn points, habitats, and placements with its world data. Share physical attachment points between simulation and rendering when they need to line up. |

### Flatbed and future fire truck

The [flatbed's ground-drive definition](../src/vehicles/flatbed.ts) holds its wheel layout, suspension, throttle, steering, and brake tuning. The [driving system](../src/simulation/ground-drive.ts) uses that definition with a chassis body and a terrain height query. The [flatbed model](../src/assets/flatbed.ts) uses the same wheel dimensions to build and animate its wheels. The current system steers the front axle and drives the rear axle.

| Vehicle | Shared traits | Equipment |
| --- | --- | --- |
| Flatbed | Ground drive and seats with the flatbed's current wheel layout, suspension, braking, and seat positions | A cargo bed with load slots and support surfaces |
| Future fire truck | The same throttle, steering, brake, and boarding rules with its own chassis dimensions, suspension, and seat positions | A pump and hose station so one crewmate can drive while the other operates the hose |

Keep the two models in the asset layer. Let island data choose where each vehicle spawns. When the host supports multiple vehicles, identify the occupied vehicle and seat together so driving and equipment commands reach the right instance. Verify the flatbed's suspension, braking, and cargo behavior before adding the fire truck's equipment.

### Interactions

Every **E** interaction shares one trait, defined in [interaction options](../src/interaction-options.ts): an action, an optional subject such as an item or farm plot, a key and label for the prompt, a name for the tooltip, and a point the reticle can aim at. The list is ordered with the best default first. The prompt, the [reticle](../src/reticle-target.ts) and the host all read the same list. The client sends the interaction the player aimed at, or the default when the reticle is on nothing. The host carries it out only if that interaction is still open to that player, so a stale or simultaneous press changes nothing. To add an interaction, add it to the list with its point and add its handler to the host's dispatch in [interactions](../server/interactions.ts).

### Residents

A [resident definition](../src/residents/definition.ts) combines traits the same way a vehicle does. Identity and appearance dress a crew rig. A schedule gives a home, a workplace, hours, a walking pace and a route. A conversation turns the shared snapshot and the crew's trust tier into a greeting and a piece of advice. A list of favors names what the resident asks of the crew, as goods, cargo, checked work finished by reporting back, or a custom job like Wren's gate. Optional remarks add the resident's own small talk. The [remark system](../src/residents/remarks.ts) mixes them with the island's shared remarks and picks one that fits the moment.

| Responsibility | Where it lives |
| --- | --- |
| Definition | One file per resident in [`src/worlds/starter/residents/`](../src/worlds/starter/residents), listed in the island's [registry](../src/worlds/starter/residents.ts). The registry index is each resident's interaction subject. |
| Behavior | [Schedules](../src/residents/schedule.ts) place a resident from the island clock, so every client and the host agree. [Favors](../src/residents/favors.ts) decide what a resident is asking, and [resident interactions](../src/residents/interactions.ts) add **Talk**, **Agree to help** and the hand-in to the shared interaction list. |
| Instance state | The host keeps one [record](../src/residents/trust.ts) per resident in the snapshot and the save: trust, kept favors, the favor under way, the last finding on checked work, and any broken promise. [Host residents](../server/residents.ts) accept, credit each favor once through `keepFavor`, and keep a crate in the yard for a cargo favor. |
| Appearance and placement | The [resident scene](../src/resident-scene.ts) builds and poses one rig per definition, marks cargo bays, and gives the place labels their names. The world layer chooses homes, stops and bays. |

To add a villager, write a definition file and append it to the registry. A visitor arriving by ferry can use the same traits once the ferry runs. A save made before the resident existed loads them as a stranger. Walk the route with the Workbench's **Resident routines** study and the walkability test in [the resident tests](../test/game-residents.test.mjs). See [Residents and favors](mechanics/resident-favors.md) for the playable rules.

### Animals and plants

- **Animals.** In [Juniper Hollow](../src/juniper-habitat.ts), hares and foxes can share locomotion and [obstacle navigation](../src/biome-navigation.ts) with different speeds and clearances. A hare's threat response can send it toward cover, while a fox can give a nearby player space and then resume its patrol. Position and current behavior belong to each animal.
- **Plants.** A habitat trait can guide where an island places reeds or clover. A regrowth trait can let clover replenish forage after grazing, with the patch's remaining forage tracked by the [biome simulation](../src/biome-model.ts). Wind sway can stay in presentation when it only affects appearance.

## Static checks

`npm run quality` runs the architecture rules through ESLint, followed by unused-code checks, coverage, type checking and the build. First-party TypeScript modules have a 350-line file limit, a 140-line function limit, and a cyclomatic complexity ceiling of 24. Line limits exclude comments and blank lines. Test files have the same file limit. The [ESLint config](../eslint.config.mjs) records per-file ceilings for existing hotspots. Lower an exception or remove it when the relevant code is split.

Import checks keep browser modules out of `server/`. Host simulation, shared simulation and world data also have checks against imports from the rendering and transport layers. Type-only imports are allowed for host command and save contracts. These checks cover direct imports. Review how dependencies flow through a feature when moving code across layers.
