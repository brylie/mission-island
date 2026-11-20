# Mission Island architecture

The LAN host owns gameplay state, including movement, crew membership, orders, the shared bank, and saved progress. The game client renders host snapshots and sends player input. The Workbench and Saltwind preview run local sessions and can reuse mechanics and assets.

## Where changes belong

| Area | Responsibility |
| --- | --- |
| [Host simulation](../server/game.ts) | Sequences each tick, routes typed crew commands, and exposes snapshots. Crew reservations, purchases and payouts, held equipment, and interactions live in their feature modules under `server/`. |
| [Host adapters](../server/multiplayer.ts) | Vite wiring, LAN invite and bank endpoints, timers, and save scheduling. [Socket sessions](../server/socket-sessions.ts) handle WebSocket framing, timeouts, and snapshot backpressure. [Save storage](../server/save.ts) handles file I/O, validation, and migration. |
| [Shared simulation](../src/simulation/) | Movement, fishing and Cannon physics that can run on the host or in a browser preview. Keep these modules independent of DOM, Babylon, and host adapters. |
| [World data](../src/worlds/) | Island-specific placement and collision definitions. Starter Island site placements and colliders live under `src/worlds/starter/`. Terrain, routes and other existing Starter Island rules still live in `src/`. Saltwind's sites, routes, terrain and tour are already split under [its preview](../src/second-island/). |
| [Assets](../src/assets/) | Reusable procedural models and their poses. Add models alongside their asset family, such as crew, buildings, flatbed, props, routes, or waterfront. Keep placement coordinates with the world that uses the model. Keep source meshes, textures and audio with their asset family and import them through Vite. Use `public/` for files that require a stable, unprocessed URL. |
| [Presentation](../src/scene.ts) | The game, Workbench, and Saltwind entry points wire browser input, views and rendering. Keep components and preview studies in feature modules. The [Workbench catalog](../src/workbench/catalog.ts) assembles studies in display order. |

## How to add a feature

- Give each module a specific responsibility and a small public interface. Keep an entry point focused on composition. When a feature adds substantial branching, state or lifecycle code, put it in the owning feature module and pass only the state or callbacks it needs.
- Keep tick order and transaction boundaries visible. A change to command timing, a checkpoint, or the order of movement, equipment, and physics can affect play and reconnects. Cover those cases through the host integration tests.
- Share browser-safe rules through feature modules. Keep protocol changes focused on fields that cross the connection. Treat saved records and public Workbench subject IDs as compatibility contracts. Update validation and migration tests when a saved format changes.
- Organize world changes by island and by site, region, or system as the content grows. Give placements stable IDs, and record which geometry affects walking, cargo, or navigation. Aim to feed render and collision builders from the same placement data. Keep Babylon mesh construction and batching in the presentation layer.
- Add regression cases to the matching `test/game-*.test.mjs` suite. The [game test harness](../test/support/game-harness.mjs) supplies fake sockets, an injected clock, and save fixtures. Use the smallest suite that exercises the feature's actual entry point.

## Static checks

`npm run quality` runs the architecture rules through ESLint, followed by unused-code checks, coverage, type checking and the build. First-party TypeScript modules have a 350-line file limit, a 140-line function limit, and a cyclomatic complexity ceiling of 24. Line limits exclude comments and blank lines. Test files have the same file limit. The [ESLint config](../eslint.config.mjs) records per-file ceilings for existing hotspots. Lower an exception or remove it when the relevant code is split.

Import checks keep browser modules out of `server/`. Host simulation, shared simulation and world data also have checks against imports from the rendering and transport layers. Type-only imports are allowed for host command and save contracts. These checks cover direct imports. Review how dependencies flow through a feature when moving code across layers.
