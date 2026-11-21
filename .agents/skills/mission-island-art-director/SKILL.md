---
name: mission-island-art-director
description: Review or refine Mission Island’s visual direction for procedural assets, inhabited places, biomes, gameplay scenes, and seasonal variants. Use for an art pass, a Workbench visual comparison, or a visual handoff to another Mission Island agent.
---

# Mission Island Art Director

Start with [creative direction](../../../docs/design/creative-direction.md) and the [Workbench guide](../../../docs/workbench.md). For habitat and seasonal work, read [island climates and seasons](../../../docs/design/climate-and-seasons.md). Use the [destination survey](../../../docs/living-world-qa.md) for named places and existing quality checks. Ground judgments in Mission Island's own working harbors, familiar homes and natural surroundings. A good composition makes the next action legible and leaves a detail worth remembering.

Use the shared [review workflow](../../../docs/playtests/review-workflow.md) to choose the harness, reproduce comparisons, and surface tooling gaps. Use the visual checks below to decide what to look for.

## Inspect at the right scale

1. Identify the player’s activity and the strongest visual question. Save a baseline using the current production model or scene. For a visual comparison, hold the baseline conditions steady. Record the build, view, distance, weather, hour, relevant seed or animation state, and rendering settings. Use **Copy setup link** for assets, **Copy playtest link** for landscapes, or **Copy recipe link** for biome trials. Reopen links before relying on them for handoff.
2. For an **asset**, study a photo that shows the relevant structure. Use **Reference image** beside the Workbench model and retain the source and license. Orbit the silhouette and scrub a representative action where relevant. Inspect the current mesh at player scale, then check a few seeds or ages together for a recognizable family of shapes. For a pine, follow trunk taper, drooping branch arcs with rising tips where the species shows them, openings in the crown, and the response to prevailing wind. Use the actual production factory if implementing the change.
3. For a **place or biome**, walk the normal approach and return route, then take an overlook or island view. Read the big masses, identify the landmark that orients the player, and look at the edges where habitats meet. Check ground contact, scale, and routes for crew and vehicles. Find one detail that tells who has used the place or how water, wind or growth shaped it. Use Biome Composer for population and behavior trials, then recheck the real site.
4. For a **scenario**, replay the visible action in its setting. Use an available disposable scenario checkpoint for interactions that depend on live multiplayer state. Watch what the active player can read and what the partner can see from their role. Check hands, tools, contact, silhouettes in motion and clearance. Inspect movement with a short clip or a scrubbed sequence when a single frame would hide the issue.
5. For a **season**, start from the same place, camera, seed, hour and weather. Step season first to see which traits actually changed, then try typical light and weather for each season. Check that both versions retain their identity, the player's path and important affordances. Use a Workbench mockup if the game lacks the control and identify it as such in the handoff.

## Make and verify the smallest useful change

Prioritize a wrong silhouette, confusing approach or broken contact before adding ornament. Preserve readable edges and important landmarks at a distance. Use local conditions to drive procedural variation. Show the result at walking distance and in context, with an additional close view when it explains the decision. Recheck collision, overlap or z-fighting where geometry changed. For denser or more animated scenes, compare frame time on the same laptop, camera and viewport during the same route before and after.

Leave a compact handoff with the reproducible view, an observed problem, the visual or player consequence, and a concrete acceptance check. Include a matched capture if it shows the difference, and state which scenarios or seasons remain unverified. Use a proposed palette or design target as a proposal until it has been seen in the game. Record durable conventions in the creative direction notes and location-specific findings with the relevant playtest or issue.
