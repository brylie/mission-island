# Craft: how we build a living island

The craft pages explain **how** Mission Island simulates the world:
- the algorithms and techniques;
- the considerations that shaped each one;
- how each technique relates to the real thing it stands in for.

The [field guide](../field-guide/README.md) explains the real world itself, and the [design pages](../README.md) explain what we chose to build and why. Craft sits between them: how a branch arc stands in for a growing pine, or how a few shaded triangles stand in for a crown a hundred metres away.

These pages are for anyone who wants to make something similar, learn from it or teach it: students of graphics, audio or simulation, procedural artists, game developers, researchers who want to check a model, and teachers. Each page opens in plain language and gets more technical as it goes.

## Pages

| Topic | Page | Status |
| --- | --- | --- |
| A guided first build: grow your first tree species | [Tutorial](first-tree-species.md) | Run by its author |
| Add or change a tree species, as a checklist | [How-to](add-tree-species.md) | Steps run |
| Growing trees, shrubs and groundcover from rules and seeds | [Procedural flora](procedural-flora.md) | Written |
| Distance, level of detail, draw calls and triangle budgets | [Rendering, distance and level of detail](rendering-and-detail.md) | Written |
| Collision physics: broadphase, sleeping bodies and contact memory | [Physics cost and static colliders](../architecture.md#physics-cost-and-static-colliders) | Existing reference; a craft page is planned |
| Generated surfaces and texture recipes | [Surface catalog](../surface-catalog.md) and [gameplay surfaces](../gameplay-surfaces.md) | Existing reference |
| Shaders for water, meadow, paving and effects | [Shader studies](../shader-studies.md), [more shader studies](../more-shader-studies.md) and the [effects shelf](../effects-workbench.md) | Existing reference |
| Synthesised sound: wind, surf, footsteps, engines, birds | Procedural audio | Planned |
| Landforms, coastlines and habitat fields | Procedural landscape | Partly written: see [island generation](../design/island-generation.md) and [Highwood habitats and forest](../backcountry.md#habitats) |
| Flocking, schooling and animal behaviour | Wildlife behaviour | Planned; see [Driftwood fish school](../driftwood-fish-school.md) |

## Where this knowledge comes from

Mission Island's expert reviewers are skills that each hold a body of craft knowledge:
- [Art Director](../../.agents/skills/mission-island-art-director/SKILL.md)
- [Natural Systems](../../.agents/skills/mission-island-natural-systems/SKILL.md)
- [Procedural Audio](../../.agents/skills/mission-island-procedural-audio/SKILL.md)
- [Game Architect](../../.agents/skills/mission-island-game-architect/SKILL.md)
- [Co-op Gameplay](../../.agents/skills/mission-island-coop-gameplay/SKILL.md)
- [Playtest and Accessibility](../../.agents/skills/mission-island-playtest-accessibility/SKILL.md)

Every verify loop asks each reviewer to hand over the knowledge its review used or discovered, as well as its verdict. The [Knowledge Keeper](../../.agents/skills/mission-island-knowledge-keeper/SKILL.md) then makes sure that knowledge reaches these pages. When a review explains why something works, that explanation belongs here.

## How to write a craft page

- **Start with the subject, not the code.** Describe what the real thing does and what a player should perceive. Then describe the technique that produces that perception.
- **Name the technique and its trade-offs.** Say what it costs, what it gets wrong, and what we tried that didn't work. Failures teach as much as successes.
- **Show the numbers that matter**, such as budgets, distances and timings. Link to the data file that owns them rather than copying values that will drift.
- **Point to a place to see it.** That can be a Workbench study, a seed or a setup link where a reader can watch the technique work.
- **Cite the ideas you borrowed** and the references that inspired the look or feel. We borrow lessons, not looks.
