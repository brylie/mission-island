# Asset Workbench

Choose a workspace to narrow the library to one job. Search matches words in subject names, descriptions, groups and workspace names across the whole catalog. Enter opens the first result and Escape clears the search. A subject’s URL works directly, including the original landscape, biome and material bookmarks.

| Workspace | What to inspect or change |
| --- | --- |
| World | Orbit Starter Island, jump to a landmark, place or move draft objects, walk the terrain, compare saved shots, or launch the Saltwind tour. |
| Ecology | Scrub hare and fox poses. Compare clover and tussock seeds and growth. Use the Biome Composer for feeding, pursuit, concealment and rain responses. |
| Construction | Edit named Starter Island furnishings in place. Review Starter houses and combine Saltwind roof, tower, canopy, width and paint options at their actual addresses. |
| Surfaces | Compare the procedural texture gallery, edit substance-specific finishes and share a material and camera setup. |
| Effects | Set fire intensity or extinguisher emission, then step through particle lifetimes. |
| Characters | Try a uniform, fabric dye or cap while posing the crew. Rehearse offering, accepting and fulfilling a fish order with a stand-in shopkeeper at Seabrook Market. |
| Vehicles | Inspect exteriors and lights. Compare vehicles on a neutral stage and at their parking or landing sites. |
| Mechanics | Replay a cargo throw, compare fishing strategies, or set the crop stage in the actual field. |

## An editing session

Open **Construction → Site furnishings → Seabrook village bench**. Select **On island** and move the bench using east and north offsets in metres. Its inspector, camera controls and geometry check stay available. **Save to landscape draft** applies the edit to Starter Island in this browser’s Workbench. **Inspect this location** returns to the landscape camera at the bench. To undo a published draft placement, reset the subject’s settings and save again. **Export placement JSON** produces coordinates, heading, size and finish suitable for review against the matching entry in `src/worlds/starter/sites.ts`. Collision geometry and the multiplayer map are authored separately.

Use **Saved variations** to build a named, browser-local collection for a subject. Each variation restores its controls, viewport and clock. Use **Copy setup link** to share a specific model, context, parameter set, camera, lighting and paused time. Use a LAN address when sharing between computers. Landscape studies and biome recipes retain their specialized formats. The map’s **Save layout** and **Export JSON** manage additional placed objects. Scene drafts and setups run separately from multiplayer saves.

## Adding a subject

1. Register an `Entry` from `src/workbench/subject.ts` in an appropriate study module. Give it a stable ID, a library group and the path to its source. Group membership determines its workspace.
2. Instantiate the production mesh factory or mechanic. Supply controls in the author’s terms and units. Use live controls for pose and placement and commit geometry changes when the control is released.
3. For a timed subject, implement scrubbing and paused frames. For interactive trials, expose actions with their availability and use the observation panel for quantities or outcomes a designer would otherwise have to guess.
4. Supply a field site when the subject has a meaningful setting. Transform the subject into island coordinates and omit the original instance when replacing a fixture. Check the pose and clearances in both settings.
5. Exercise a shared setup in a fresh browser tab. Verify that settings, time, camera and site survive, and that the trial leaves live saves untouched.

## Scope of the trials

The cargo trial steps the actual Cannon simulation at the server’s fixed rate. The fishing trial uses the server’s cast validation, bite probability and fight rules. It guarantees a bite after a valid cast so reeling strategies can be compared. The farm preview exposes crop states. The conversation rehearsal uses the game’s market order quantities and contribution rule. Dialogue, range gating, and handover in that rehearsal are Workbench fixtures.

Further work can add named plant species backed by shared generators, production villager schedules and friendship once those systems exist, collision updates for edited scenery, and a versioned catalog of approved material and building recipes. Each can use the existing subject, field site and setup-link conventions.

## Fish schooling trial

In **Ecology → Biome Composer**, choose **Open fish schooling trial**. Six fish cruise in an isolated pool. Watch the default crossing, then choose **Wading player** or **Paddled skiff** and replay the same seed. A click on the water redirects the actor. With the canvas focused, tap **W/A/S/D** to direct it two metres relative to the current view. Press **Space** to pause or resume.

**Randomize school** starts a fresh encounter with a different shoal shape, heading and set of individual speeds. For a controlled comparison, enter seed **125**, select the skiff, and watch the default crossing. Pause at 25 seconds and toggle **Nudge fish 1 east by 5 cm**. Only that initial position changes. Look for differences downstream in who scatters or takes the lead. The setup link retains the nudge as well as the seed.

Each follower sees the leader's recent path with its own short delay. Seeded, mean-reverting Brownian noise gently varies each fish's direction. A fish can bank more sharply while startled. Its body turns with its direction of travel, including when it slows to regroup.

Approach one flank, then move away. Watch which fish turn first, follow their trails, and look for the gold ring around the fish they regroup on. Make a second pass from the opposite side. Rewind to replay your recorded route; steering after a rewind replaces subsequent moves. **Copy setup link** includes the route, actor, seed, view and timeline position. **Reset** restores the default crossing. The [Driftwood field playtest](https://github.com/brylie/mission-island/issues/68) follows this Composer trial.
