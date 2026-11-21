# Contributing to Mission Island

Start with the [design handbook](docs/README.md) to see which parts of the game are playable and what the team wants to learn next. A two-player observation, a repeatable Workbench scene, and a small change to a mechanic are all ways to contribute.

## Set up a development host

Install Node.js 22.13 or newer and Mise. From the project root, run the following to install dependencies and the Git hooks, then start the LAN host.

```sh
mise trust
mise run setup
npm run dev
```

Open the printed Local URL. Follow the [LAN instructions](README.md#play-on-your-local-network) for the second browser. To test a fresh crew alongside an existing host, choose an unused save name and port. Reusing a name resumes that save.

```sh
MISSION_ISLAND_SAVE=second-shift-trial npm run dev -- --port 5176 --strictPort
```

Run one host per save. The [player guide](docs/player-guide.md#saves-and-reconnecting) covers save files and browser identity.

## Run a live playtest scenario

Run `npm run playtest` and open the printed **Network** URL on both computers. **Options → Copy LAN link** shares the address. The in-memory host defaults to port 5194 and ignores `MISSION_ISLAND_SAVE`. To use another free port, run `npm run playtest -- --port 5195`.

Press **O → Live playtest** or open **Live checkpoints** in the Workbench on the same host. Select a scenario and crew size. **Start checkpoint** sets up the world, places each player and waits for the requested crew. **Restart checkpoint** restores that scenario’s baseline for everyone. Refreshing a browser rejoins the current run. To change to solo, leave one browser connected.

| Scenario ID | Starting condition |
| --- | --- |
| `dock-fishing` | Each angler stands at the end of the fishing dock, facing open water with a rod equipped. Cast immediately to test the current fishing mechanic. |
| `ferry-approach` | The ferry repair is open and the crew stands by the flatbed on the return road from Seabrook. Drive to the ferry without the map to try the approach. |
| `ferry-restored` | The ferry ramp is open. The flatbed waits on Harbor Depot road, facing the terminal. |
| `ferry-yard` | The flatbed is parked in the ferry freight yard with two timber crates behind it. Stack them by the yard pallet. |
| `harbor-delivery` | The crew starts beside the supply crates with the Harbor Depot delivery active. |
| `wren-fit` (default) | One player has the toolbox and the other has the pin. In solo play the toolbox rests by the gate. Press **E** to fit the pin and **E** again to test the swing. |
| `wren-discover` | The crew arrives outside the unrepaired garden. |
| `wren-morning` | The repair is paid and Wren is about to leave home. |
| `wren-swell` | Two days later, the crew has agreed to plane Wren's swollen gate. The toolbox is beside the gate and Wren is at the mending bench. To try a breach, swing the gate, see it catch, then tell Wren it swings clear before planing. To finish the repair, swing the gate and see it catch, plane the edge, swing it again and report honestly. Planing needs a swing that caught, and a false report clears the finding, so after one, swing the gate again before planing. |
| `ridge-checkout` | The crew is unqualified. The first player stands at the Windstone Ridge loan rack facing the meadow. In a pair, the second stands beside the landing sign to mark the meadow. Press **E** to launch the checkout. |
| `ridge-soaring` | A dry 10:30 with the crew qualified and the Mirror Pool survey done. Both players stand at the rack. Press **E** for an island survey flight and climb in the rising air. |
| `village-favors` | At 09:30 after the starter shift, the crew stands beside Bram at the depot. Each crewmate carries two fish and two carrots for Ines's and Mara's favors. |
| `field-outing` | At 07:30, both players stand near Mara on the fishing dock with a fresh field journal. Follow her leads to Shellglass and Juniper, then look for sheltering hares during the first late-morning shower. |

Agents can use the same scenario IDs from the shell. For example, to try fishing alone:

```sh
MISSION_ISLAND_CHECKPOINT=dock-fishing MISSION_ISLAND_CREW_SIZE=1 npm run playtest
```

### Add a scenario for a job, mechanic or field test

1. Define a [Scenario](server/scenarios/scenario.ts) alongside the [harbor examples](server/scenarios/harbor.ts). Give it a stable ID, a menu title and its island. Implement `placePlayer` to establish each seat’s position, heading and equipment. Use the seat ID for repeatable co-op roles. The host can call placement again before the crew is ready, so make it safe to repeat.
2. Use `prepareWorld` for initial time, mission progress, inventory in the world or a balance. Use `startCrew` for conditions that require connected players, such as a carried item or vehicle assignment. It runs once per fresh run after all requested seats have joined.
3. Register the definition in the [host catalog](server/scenarios/catalog.ts). This supplies the CLI validator and publishes the available choices to browsers. The current live simulation supports Starter Island. A new island needs a playable host for its mechanics before it can offer live scenarios.
4. Exercise the normal gameplay action from the starting state in solo and two-seat tests. Restart and check that both seats see the original state. For a visual or exploratory outing, record the human observation separately from the automated checks. [Checkpoint tests](test/live-checkpoints.test.mjs) · [Playtest findings](docs/playtests/findings.md)

## Submit a playable change

Use the [shared review workflow](docs/playtests/review-workflow.md) to choose the right harness, share a reproducible starting point, and report a tool gap that affected the review.

Choose a player outcome from the milestone, link its design brief, and describe how someone can reproduce the starting state. The [playable change issue template](.github/ISSUE_TEMPLATE/playable-change.md) works for a mechanic, a destination, or a problem found during play. For a co-op change, describe what each player can do and see, and how one person can finish alone. Link a [playtest finding](docs/playtests/findings.md) when one motivated the change.

In the pull request, include the issue, what you tried, and any untested part. For visual changes include a screenshot or a reproducible Workbench view. Update the relevant mechanic spec when the player-facing behavior changes.

## Quality checks

```sh
mise run quality
mise run audit
```

The pre-commit hook checks file formats, merge markers, private keys, and large additions. It also runs type-aware ESLint with security and complexity rules, the TypeScript type check, and the mechanics tests. ESLint caches its results in `node_modules/.cache/eslint/`, so it only re-checks files that changed. A cached file can miss a type-aware error when a file it depends on changes, so the pre-push hook lints again without the cache.

The pre-push hook runs ESLint without the cache, Knip for unused code and dependencies, the production build, and the npm dependency audit.

`mise run quality` runs the npm scripts behind both hooks. It skips the hooks' built-in file checks, such as `detect-private-key` and `check-json`, and the audit. To run every hook check, use `prek run --all-files --hook-stage pre-commit` and `prek run --all-files --hook-stage pre-push`. Run the audit separately with `mise run audit`.

The coverage gate runs only in CI, because it takes a few minutes. It fails the build when lines, functions, or branches drop below 81% across the host and shared mechanics. Run it locally with `npm run coverage`.

On pull requests into `main` and pushes to `main`, GitHub Actions runs the pre-commit and pre-push checks and the coverage gate. Open **CI → Quality and tests** to inspect coverage, the build, and the dependency audit.

## Build and iterate together

- Edit `src/style.css` for the HUD or `src/scene.ts` for the 3D scene. Vite hot-updates both browsers while the host keeps the mission running.
- Browser code without a hot-update handler gets a page refresh. Ordinary seats are held for 12 seconds, and the skiff holds a seat for two minutes.
- Editing server rules or shared world geometry can restart Vite. The server restores the current save on startup.
- Use `npm run check` for TypeScript checks. `npm run build` makes a browser build, and `npm run preview` serves that build with the same LAN game server.

## Asset Workbench

Run `npm run dev` and open [the Asset Workbench](http://localhost:5173/workbench.html). It runs separately from the LAN session and needs no second player. A selected asset has its own URL, such as [Crew character](http://localhost:5173/workbench.html#crew) or [Water](http://localhost:5173/workbench.html#water).

Choose a workspace or search across the entire catalog. For supported subjects, **Studio** and **On island** keep the same inspector while switching surroundings. Try [editing the Seabrook bench in place](http://localhost:5173/workbench.html#site-town?stage=island) or [composing the Saltwind school](http://localhost:5173/workbench.html#saltwind-school?stage=island). The [Workbench guide](docs/workbench.md) covers draft storage, shareable setups, mechanic trials and adding new subjects.

- Drag to orbit, scroll to zoom, and right-drag to pan. Use the **3D**, **Front**, **Side**, and **Top** buttons to reframe. Compare daylight, overcast, and golden-hour lighting, or turn on wireframe and the turntable.
- Play, pause, scrub, or advance a frame in timed previews. Try different crew animations, truck steering and cargo, extinguisher bursts, or the fire at different intensities.
- Check each prop variant, compare road and trail widths, and inspect the same geometry used in the game. Use the Texture gallery to compare surface presets and noise families. The material panels use physical descriptions such as grain spacing, chip relief, pitting, or oxidation. The water preview animates on the timeline, and the shader drafts have a separate preview.
- Edit a shared asset or shader file while its preview is open. Vite refreshes the scene and keeps the selected asset, camera, and controls. The inspector shows the relevant source file.

For asset reviews, include a Workbench link that opens the model next to the reference detail. The CLI accepts an existing setup link, photo URL, crop and accessible description. [Prepare a comparison link](docs/workbench.md#prepare-a-comparison-link-from-the-command-line)

Shared model factories live in `src/assets/`. Add or extend a preview in the matching `src/workbench/` study module. The shader drafts live in `src/workbench/surface.frag.glsl` and `src/workbench/surface.vert.glsl`. The workbench is available from the development server.

The [Landscape Workbench](http://localhost:5173/workbench.html#landscape) loads the real island scenery. **Scenic view** frames Pinewoods at sunrise, the harbor at sunset, or Fernfall and pauses the timeline for repeatable comparisons. Open [Pinewoods sunrise](http://localhost:5173/workbench.html?view=pinewoods-sunrise#landscape) directly, then toggle **Volumetric sunlight** or adjust **Sun shaft intensity** to compare the lighting in place. The game uses the 100% setting.

Use **Focus X (m)**, **Focus Z (m)**, and **Focus above ground (m)** to position the orbit target. Drag to orbit, scroll to zoom, and right-drag to pan. Set the hour and rain to inspect the site in different conditions. The geometry scan covers a 30 m radius along each horizontal axis around the camera target.

Open **Island map** to jump to terrain or a labeled landmark. Gold pins mark saved camera positions and reopen their shots. The **Saved shots** menu also reaches overlapping pins and cameras outside the map. Choose **Place scenery** and an object, then click the map to add it to **Layout draft** and frame it in 3D. The map shows the current focus and draft objects as you work. With the map focused, use the arrow keys to move the cursor and Enter to act.

Scroll over the map or use **+** and **−** to zoom. Drag the map to pan, and use **Reset** to return to the whole island. Drag a teal draft marker to move its object while keeping the 3D camera in place. With a marker focused, the arrow keys nudge it by 10 cm, or by 1 m with Shift. Use **Save layout** to keep the new positions.

Open **Landscape studies** to name and save a shot with its camera, weather, display settings, and animation frame. **Open** restores the shot and pauses the timeline. **Copy link** shares the saved settings with another Workbench session.

Choose **Capture reference**, then change the lighting, test a draft placement, or edit the scene code. Drag the comparison slider to reveal more of the reference or live render. The reference survives reloads in the same tab. Turning **Compare** back on restores its camera and animation frame while keeping your live lighting settings.

Use **Layout draft** to place a test player, truck, crate, rock, or tree at the camera focus. Select a test player and focus the canvas to walk or jump using the game's terrain and collision rules. Move or remove selected objects, save the layout in the browser, or export the coordinates as JSON.

Use **Undo** and **Redo** in Layout draft or on the Island map to step through placements, moves, and removals. **Ctrl/Cmd+Z** undoes an edit, and **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redoes it. History lasts until you reload the Workbench. **Save layout** stores the current arrangement.

The [Biome Composer](http://localhost:5173/workbench.html#biome) stages a 16 m habitat using island assets. Choose a starting habitat and press **Apply**, then use the codex to set the number of each plant, animal and shelter. **Copy recipe link** reopens the composition from the beginning on any browser that can reach the server. Use the LAN address when sharing between computers. Use **Export JSON** to keep a versioned recipe in source control and **Open JSON** to edit it again.

For a controlled comparison, open **Meadow edge**, pause at 60 seconds and read **Field observations**. Set tussocks, pines, logs and boulders to zero while keeping the seed and playback time fixed. Compare escapes and close encounters. Restore cover, remove the fox, and raise rain above 65% to watch hares seek logs and trees. The timeline replays the whole trial under the selected conditions.

### Z-fighting QA check

Run this check on new or changed geometry, especially stacked trim, rails, roof joints, decals, and intersecting paths.

1. Open the asset in the Workbench. Select its variants and check any pose that moves pieces together. Include the truck with and without cargo and check the high and low points of the skiff's bob.
2. Choose **Geometry QA → Check z-fighting**. It pauses animated assets and reports mesh pairs with overlapping faces near the same plane, plus approximate world coordinates. A shared edge or a one-sided butt joint facing inward is normal. For a visible flagged overlap, adjust the joint, merge a continuous surface, or add clearance.
3. Turn off the grid. Orbit slowly with **Turntable** or drag the camera, zooming both close and far. Look along surfaces at a grazing angle and from above and below. Switch lighting to help distinguish a shadow artifact from surfaces flickering as the camera moves. Use **Wireframe** to identify the pieces at a seam.
4. Check the assembled asset in the game from the follow camera and island view. Include joints with neighboring scenery and the terrain, like sidewalk junctions or a hull at the waterline. Pass when visible surfaces stay stable while the camera and parts move.

The scanner compares indexed mesh faces in the selected preview pose. The distance threshold is 0.5 mm at island scale. Rendered water, particles, shadows, and depth precision at gameplay distances still need the visual pass.

### Babylon.js graph authoring

The [Babylon.js MCP servers](https://doc.babylonjs.com/toolsAndResources/mcpServers/) can help with authoring editor graphs on the development laptop.

- **Node Material Editor (`nme`).** Prototype water or terrain materials, export the graph as JSON, and add it as a workbench sample to compare under the island's lighting. [Node Material documentation](https://doc.babylonjs.com/features/featuresDeepDive/materials/node_material/nodeMaterial/)
- **Node Particle Editor (`npe`).** Author extinguisher mist, smoke, or sparks and compare the exported effect with the workbench's existing burst preview. [Node Particle Editor documentation](https://doc.babylonjs.com/toolsAndResources/npe/)
- **Node Geometry Editor (`nge`).** Explore procedural prop variants, such as rock shapes and tree canopies, and preview them before placing them on the island. [Node Geometry documentation](https://doc.babylonjs.com/features/featuresDeepDive/mesh/nodeGeometry/)

Keep chosen graph exports in the project so both the game and the workbench can load the same files during development.

## How the prototype fits together

See the [architecture guide](docs/architecture.md) for dependency boundaries and where to add features, assets, or world content.

Use typed traits when entities can share behavior with different tuning or equipment. [Composing behavior with traits](docs/architecture.md#composing-behavior-with-traits)

Babylon.js draws the island and vehicle exteriors. Vite serves the game and its development updates. The host runs the shared simulation at 30 ticks per second. Browsers send inputs and receive snapshots over a same-origin WebSocket. The host assigns vehicle seats, tracks item ownership and fishing rewards, and advances the mission for both players. Cannon-es simulates loose crates on the terrain and on the moving flatbed. The clients render the position and rotation the host sends.

- `src/world.ts` holds island coordinates, buildings and mission locations.
- `src/scenery.ts` shares prop placement between collision and rendering. `src/terrain.ts` defines the shoreline and wading depth.
- `src/routes.ts` defines road, walkway, and trail centerlines used to draw the terrain and minimap.
- `src/protocol.ts` defines what clients and the host exchange.
- `src/actions.ts` shares proximity rules between the game and its prompts.
- `server/game.ts` sequences the simulation and routes commands to the owning feature. `server/multiplayer.ts` wires it to Vite, WebSockets and saves.
- `src/simulation/cargo.ts` simulates crate gravity and collisions with the terrain and moving flatbed.
- `server/skiff.ts` applies paddling, steering, shoreline clearance, and disembarkation.
- `src/scene.ts` builds the exterior models and camera.

Babylon.js keeps the main development workflow in Vite. Bevy also runs in a browser, with Rust gameplay changes going through a WebAssembly build. See the [Babylon.js Vite guide](https://doc.babylonjs.com/guidedLearning/usingVite/) and [Bevy's WebAssembly examples](https://github.com/bevyengine/bevy/blob/main/examples/README.md#wasm).

When adding vehicles, keep boarding on foot and the exterior camera. Track vehicle IDs and seats on the host so two vehicles of the same type can have different occupants. A first prototype can be a pump truck at Forest Lookout, a skiff servicing a buoy, or an aircraft carrying one load between two landing sites. Give the crew one destination and a job they can finish together before expanding that vehicle’s mission set.
