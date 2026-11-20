# Mission Island

A two-player browser game about running an island service crew. Load a flatbed with supplies at Harbor Depot, drive to Seabrook and unload together. Then pick up extinguishers and deal with a fire at Forest Lookout.

## Play on your local network

On the host laptop, use Node.js 22.13 or newer and run these commands in the project folder.

```sh
npm ci
npm run dev
```

Open the **Local** address Vite prints on the laptop. On the other computer, open the **Network** address it prints. Keep both computers on the same local network. The second computer only needs a keyboard and a browser with WebGL. The crew card shows when both players have joined. If the LAN address is unreachable, check that both machines can talk on the network and that the laptop's firewall allows incoming connections to Node.

| Key | Action |
| --- | --- |
| **W A S D** or **arrow keys** | Walk relative to the camera. In the truck or skiff, W/S move forward or reverse and A/D steer. |
| **E** | Use the action shown in the prompt. Pick up or deliver cargo, work a farm plot, contribute to a market order, or open the job board. |
| **F** | Board or leave a stopped truck or skiff. The first player takes the truck wheel. Both skiff seats can paddle. |
| **Shift** | Hold to sprint on foot or drive slowly and steer gently. |
| **Space** | Jump on foot or hold to brake while driving. |
| **Left click** | Reach or use an equipped tool. Hold and release to throw a crate or cast the fishing line. |
| **Right click** | Hold to raise your right hand while on foot with that hand free. Your crewmate can see the gesture. |
| **B** | Buy one carrot seed at Seabrook Market. |
| **1 / 2 / 3** | Equip or stow your fishing rod, hoe, or watering can. |
| **R** | Keyboard shortcut for spraying the extinguisher. |
| **C** | Switch between the island overview and the close third-person view. |
| **Mouse** | Look around your character or vehicle. The first gameplay keypress captures the mouse. |
| **Esc** | Release the mouse. Press a gameplay key to capture it again. |
| **O** | Open Options for your name, appearance, mouse look, and **Respawn at home**. |

Bring crates to the tail of the truck to set them on the bed. Jump over the low rear lip and ride along on the bed as the truck moves. The side rails and rear lip help keep crates aboard through turns. At Seabrook, step out, collect each crate from the bed, and press **E** with the crate inside the glowing teal delivery circle. The beach has a shallow wading shelf. You slow down as the water gets deeper.

Jump onto or over low rocks and crates. The bed or hood gives you a second jump onto the cab roof.

Each starter crate delivered pays two coins per player. Completing the delivery pays three more, and clearing the lookout fire pays four. The truck's headlights and taillights come on around dusk, along with street lamps in the settlements.

The truck has four-wheel suspension and follows the terrain under each wheel. **W** accelerates, **S** brakes when moving forward and then reverses, and **Space** applies the brake without changing direction. Brake lights work in daylight and at night. Cargo and players riding on the bed move with the truck, so slowing down before sharp corners and rough ground helps keep the crates aboard.

### Repeatable orders

After the lookout fire, press **E** at the Harbor Depot job board to take the next crew order. You can read the board from the mission panel anywhere on the island. Deliver seed crates to Island Farm, take beach gear to Driftwood Beach, or fill fish and carrot orders at Seabrook Market. Either player can contribute to an order. You can keep fishing, farming, or exploring while the order is open.

Orders pay each member of the crew who joined the job, including teammates who reconnect after the reservation ends. Four completed orders mark the crew ready for the future second island. Coins are available to spend along the way. See the [crew orders specification](docs/mechanics/crew-orders.md) for payouts and rules.

### Starting tools and island life

Press **E** at the chest outside your starting cottage to take your tools and one free carrot seed. While holding a crate, aim toward the truck bed and hold **left click**, then release to throw. A tap makes a short throw.

Equip the fishing rod and aim into the water from the shore, the harbor dock, or a stopped skiff. Hold **left click**, then release near the top of the rising and falling cast meter to cast farther and improve your odds. When a fish bites, hold **left click** to reel and release when it pulls. Watch line tension and land the fish before it escapes. To take the skiff, walk into the shallows beside the dock and press **F** near it. Both seats can paddle. Return to shallow water and stop before disembarking.

At Island Farm, till with the hoe, plant with **E**, water with the watering can, and come back to harvest. Sell fish and carrots at the striped awning at Seabrook Market. Buy the Harbor angler uniform for three coins in **Options → Crew appearance**. Finishing the delivery and firefighting missions unlocks two more uniforms.

### Art direction

Keep the Micro Machines feel from island view with strong silhouettes, readable paint colors, and a compact layout. Use the third-person view to judge human-scale details like a believable grip on a tool, faces, steps, rail joints, and the waterline of a boat. The Pinewoods climbs gently away from the flatter roads and mission yards. Wildflowers and fish schools add life with small shared meshes and a few moving groups.

Use **Set name** in the crew panel to edit the name above your character. The [game design document](docs/game-design.md) covers the direction and mechanic specifications. The [roadmap](docs/roadmap.md) keeps the playable features and future playtest ideas together.


The market sells carrot seeds for one coin each. Sell fish or carrots at the awning with **E**. Plant seeds in tilled ground, then water them by hand or wait for a shower. Watered carrots grow in daylight. The shared island clock runs one day every eight real minutes. At night, press **E** at your cottage door. Dawn begins when every connected player turns in. Press **E** again or walk away to cancel while waiting.

Follow the northern hills to discover landmarks. Their names fade with distance in the follow view and stay on your island overview after discovery. The minimap keeps the coastline, biomes, route lines, and a simpler set of symbols. One world unit is one metre. The buoy line sits 75 metres offshore.

### Saves and reconnecting

The host automatically saves in `.mission-island/saves/island-5173.json` for the usual port. The island clock, missions, farm, item positions, crew names, discoveries, and personal progress survive a restart. The same browser profile reclaims its crew identity. For a separate named save, start the host with a lowercase slot name.

```sh
MISSION_ISLAND_SAVE=weekend npm run dev
```

Run one host per save. Use `MISSION_ISLAND_SAVE=off` for a temporary playtest. Open tabs keep the last rendered scene during reconnect and a styled loading screen shows the current phase when the page reloads. Skiff seats are reserved for two minutes during a reconnect and move with the skiff. Use **WASD** to swim if you land in deep water, or choose **Options → Respawn at home**. Respawning brings your inventory and coins and safely releases loose cargo.

## Build and iterate together

- Edit `src/style.css` for the HUD or `src/scene.ts` for the 3D scene. Vite hot-updates both browsers while the host keeps the mission running.
- Browser code without a hot-update handler gets a page refresh. Ordinary seats are held for 12 seconds, and the skiff uses the longer reconnect window above.
- Editing server rules or shared world geometry can restart Vite. The server restores the current save on startup.
- Use `npm run check` for TypeScript checks. `npm run build` makes a browser build, and `npm run preview` serves that build with the same LAN game server.

## Asset Workbench

Run `npm run dev` and open [the Asset Workbench](http://localhost:5173/workbench.html). It runs separately from the LAN session and needs no second player. A selected asset has its own URL, such as [Crew character](http://localhost:5173/workbench.html#crew) or [Water](http://localhost:5173/workbench.html#water).

- Drag to orbit, scroll to zoom, and right-drag to pan. Use the **3D**, **Front**, **Side**, and **Top** buttons to reframe. Compare daylight, overcast, and golden-hour lighting, or turn on wireframe and the turntable.
- Play, pause, scrub, or advance a frame in timed previews. Try different crew animations, truck steering and cargo, extinguisher bursts, or the fire at different intensities.
- Check each prop variant, compare road and trail widths, and inspect the same geometry used in the game. Use the Texture gallery to compare surface presets and noise families. The material panels use physical descriptions such as grain spacing, chip relief, pitting, or oxidation. The water preview animates on the timeline, and the shader drafts have a separate preview.
- Edit a shared asset or shader file while its preview is open. Vite refreshes the scene and keeps the selected asset, camera, and controls. The inspector shows the relevant source file.

Shared model factories live in `src/island-assets.ts`. Add or extend a preview in `src/workbench/catalog.ts`. The shader drafts live in `src/workbench/surface.frag.glsl` and `src/workbench/surface.vert.glsl`. The workbench is available from the development server.

The [Landscape Workbench](http://localhost:5173/workbench.html#landscape) loads the real island scenery. Enter **Focus X (m)** and **Focus Z (m)** to move the orbit target. Drag to orbit, scroll to zoom, and right-drag to pan. Set the hour and rain to inspect the site in different conditions. The geometry scan covers a 30 m radius along each horizontal axis around the camera target.

Use **Layout draft** to place a test player, truck, crate, rock, or tree at the camera focus. Select a test player and focus the canvas to walk or jump using the game's terrain and collision rules. Move or remove selected objects, save the layout in the browser, or export the coordinates as JSON.

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

Babylon.js draws the island and vehicle exteriors. Vite serves the game and its development updates. The host runs the shared simulation at 30 ticks per second. Browsers send inputs and receive snapshots over a same-origin WebSocket. The host assigns vehicle seats, tracks item ownership and fishing rewards, and advances the mission for both players. Cannon-es simulates loose crates on the terrain and on the moving flatbed. The clients render the position and rotation the host sends.

- `src/world.ts` holds island coordinates, buildings and mission locations.
- `src/scenery.ts` shares prop placement between collision and rendering. `src/terrain.ts` defines the shoreline and wading depth.
- `src/routes.ts` defines road, walkway, and trail centerlines used to draw the terrain and minimap.
- `src/protocol.ts` defines what clients and the host exchange.
- `src/actions.ts` shares proximity rules between the game and its prompts.
- `server/game.ts` owns movement, seats, equipment and mission progress.
- `server/cargo.ts` simulates crate gravity and collisions with the terrain and moving flatbed.
- `server/skiff.ts` applies paddling, steering, shoreline clearance, and disembarkation.
- `src/scene.ts` builds the exterior models and camera.

Babylon.js keeps the main development workflow in Vite. Bevy also runs in a browser, with Rust gameplay changes going through a WebAssembly build. See the [Babylon.js Vite guide](https://doc.babylonjs.com/guidedLearning/usingVite/) and [Bevy's WebAssembly examples](https://github.com/bevyengine/bevy/blob/main/examples/README.md#wasm).

## Future vehicles and missions

Keep the walk-up boarding and exterior camera for every vehicle. When the island has multiple vehicles of the same type, give each an ID and seat list and include the occupied vehicle ID with each rider. Keep ground, water and flight movement on the host with rules specific to each. Extend the shared pose with altitude and orientation when a mission needs them.

- **Ground.** Run a pump truck to Forest Lookout. One player can position the truck while the other operates the hose.
- **Water.** Use the skiff for buoy service or a rescue. Add a docking interaction and equipment for dedicated rescue boats.
- **Air.** Add an airstrip and a landing pad. Use airplanes for runway-to-runway supplies and helicopters for rooftop or backcountry pickups.

Each new mission can start with one destination, one vehicle and a shared objective you can playtest together.

## Quality checks

With Mise installed, trust this checkout's configuration and run the setup task. Mise supplies the pinned prek version.

```sh
mise trust
mise run setup
mise run quality
```

The pre-commit hook checks file formats, merge markers, private keys, and large additions. It also runs type-aware ESLint with security and complexity rules, Knip for unused code and dependencies, the mechanics tests, and the production build. The coverage gate requires at least 81% for lines, functions, and branches across the host and shared mechanics. The pre-push hook audits npm dependencies. Run the audit separately with `mise run audit`.
