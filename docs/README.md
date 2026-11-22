# Mission Island design handbook

Mission Island is a third-person co-op game about two people making a home on a working island. One good session might end with three crates delivered. Another might end with a carrot harvest and the discovery of a path the crew has driven past a dozen times.

## Find the right page

| If you are asking… | Start here |
| --- | --- |
| What are we making, and what should a session feel like? | [Product and game design](game-design.md) and [creative direction and inspirations](design/creative-direction.md) |
| How do jobs teach practical skills and lead to later careers? | [Learning through island work](design/learning-and-careers.md) and the [Co-op Gameplay Designer skill](../.agents/skills/mission-island-coop-gameplay/SKILL.md) |
| How do jobs, favors and incidents share the crew’s attention? | [Island activity scheduler](design/island-activity-scheduler.md) |
| What can we play today, and where is the crew going next? | [Playable features and roadmap](roadmap.md) and [the crew’s progression](design/progression.md) |
| Where should a feature, asset, or world edit go? | [Architecture and contribution guide](architecture.md) |
| How do I plan or review a feature across systems? | [Game Architect skill](../.agents/skills/mission-island-game-architect/SKILL.md) |
| What exactly happens when a player uses something? | [Starter chests and tools](mechanics/inventory.md), [charged throws](mechanics/throwing.md), [fishing](mechanics/fishing.md), [swimming and the shallows](mechanics/swimming.md), [farming and sales](mechanics/farming-and-market.md), [orders and pay](mechanics/crew-orders.md), [neighbor repairs](mechanics/neighbor-repairs.md), [the fire watch and wildfires](mechanics/fire-watch.md), [the ferry terminal project](mechanics/ferry-terminal.md), and [the field journal](mechanics/field-journal.md) |
| What belongs at this location? | [Inhabited places](game-design.md#an-inhabited-island), [the two-island destination survey](living-world-qa.md), and [Saltwind’s site inventory](saltwind-island.md) |
| What gives the crew a reason to stay for a season? | [Starter Island story and cadence](design/starter-island-story-and-cadence.md) |
| Where should the first Starter Island world-building pass begin? | [Starter Island world-building brief](design/starter-island-worldbuilding-brief.md) |
| How do habitats fit together across Starter Island? | [Starter Island biome plan](design/starter-island-biomes.md) |
| How should a place change with latitude, exposure, or time of year? | [Island climates and seasons](design/climate-and-seasons.md) |
| How do I review or improve the look of a model, place, or seasonal scene? | [Creative direction](design/creative-direction.md) and [Art Director skill](../.agents/skills/mission-island-art-director/SKILL.md) |
| Which color should a new asset use, and how do light and color fit together? | [Color direction](design/color-direction.md) (proposal) |
| How do I design or review generated sound and island ambience? | [Procedural Audio skill](../.agents/skills/mission-island-procedural-audio/SKILL.md) |
| How do we get variation that still makes sense? | [Generativity and the Juniper Hollow habitat](game-design.md#generativity) and [the Biome Composer workflow](../CONTRIBUTING.md#asset-workbench) |
| How do I review an ecological or procedural simulation? | [Natural Systems Reviewer skill](../.agents/skills/mission-island-natural-systems/SKILL.md) |
| What is a species, habitat or term in the real world, and what does the game simplify? | [Field guide](field-guide/README.md): [Highwood plants](field-guide/highwood-plants.md), [Highwood habitats](field-guide/highwood-habitats.md) and the [glossary](field-guide/glossary.md) |
| How are Highwood trees and shrubs generated, and what budgets apply? | [Highwood species](highwood-species.md) and its Workbench study |
| How do we grow trees, synthesise sound or keep thousands of objects fast, and why do those techniques work? | [Craft](craft/README.md): [procedural flora](craft/procedural-flora.md), [rendering, distance and level of detail](craft/rendering-and-detail.md), and links to surface and shader studies |
| Which way is +x, how long is an island day, and how do seeds work? | [Conventions](conventions.md) |
| What might the game wrongly teach, what don't we know yet, and where do our facts come from? | [Misconceptions](misconceptions.md), [open questions](open-questions.md) and the [sources register](sources.yaml) |
| How do we keep what we learn? | [Knowledge Keeper skill](../.agents/skills/mission-island-knowledge-keeper/SKILL.md) |
| How can I check the idea with another player? | [Fresh-save playtest through the first shared payout](playtests/starter-island-first-payout.md), [LAN play and saves](../README.md#play-on-your-local-network), [Workbench guide](workbench.md), and [Saltwind traversal and performance checks](saltwind-qa.md) |
| Why did we choose this, or where should a new idea go? | [Design decisions and open questions](design/decisions.md) |

## Learn from Mission Island

These docs are also a knowledge base. Every mechanic, design choice and piece of the natural world we build is written down with its reasoning, so the project is useful beyond the game itself.

The [knowledge framework](knowledge-framework.md) explains how it's organised:
- game design documents, beside a knowledge base organised by subject: the [field guide](field-guide/README.md) for the real world, [craft](craft/README.md) for how we build it, with a [tutorial](craft/first-tree-species.md) and a [how-to](craft/add-tree-species.md), and design decisions for why;
- every statement marked as true of the real world, the island, our build, or our reasoning.

| If you are… | Start with |
| --- | --- |
| A student or curious player | Field guide pages on topics such as [wildfire](field-guide/processes/wildfire.md) and [wet woodland](field-guide/places/wet-woodland.md), the [field guide](field-guide/README.md) for species, habitats and terms, then the [player guide](player-guide.md) and the [field journal](mechanics/field-journal.md) |
| A teacher or parent | [Learning through island work](design/learning-and-careers.md) for the skills play can teach, and the field guide's *Notice this* prompts for observation activities |
| A researcher or scientist | The field guide's *In the game* notes, which say what each system models and simplifies, then the [Natural Systems Reviewer skill](../.agents/skills/mission-island-natural-systems/SKILL.md) and the [climate and seasons](design/climate-and-seasons.md) page |
| A game designer | [Product and game design](game-design.md), the [mechanic pages](#from-a-playtest-to-a-design-change), and [design decisions](design/decisions.md) with the reasons behind them |
| A developer, artist or student of graphics, audio or simulation | The [first tree species tutorial](craft/first-tree-species.md), then [Craft](craft/README.md) for how we build things and why the techniques work, then [Architecture](architecture.md), the [contributing guide](../CONTRIBUTING.md), the [Workbench guide](workbench.md), and [creative direction](design/creative-direction.md) |

Each change updates the pages it touches, and the [Knowledge Keeper](../.agents/skills/mission-island-knowledge-keeper/SKILL.md) checks this in every review. If you learned something here that isn't written down, add it, or open an issue.

## Plan and test the next shift

| When you need to… | Use |
| --- | --- |
| Choose what to build after the first payday | [Second-shift brief and acceptance playtest](design/second-shift.md) |
| Compare hauling with farming and fishing before pricing a repair | [Starter Island economy and pacing sheet](design/starter-economy.md) |
| What everyday services should Seabrook add? | [Village services and residents](design/seabrook-village-services.md) |
| Plan a village route, sample week, or starter career | [Starter Island play plan](design/starter-island-play-plan.md) |
| Give a resident a routine, a memorable workplace and a reason to return | [Resident and destination briefs](design/residents-and-destinations.md) |
| Review a mechanic from a new player’s viewpoint | [Playtest and Accessibility Reviewer skill](../.agents/skills/mission-island-playtest-accessibility/SKILL.md) |
| Set up a repeatable review and share the evidence | [Shared Workbench and playtest workflow](playtests/review-workflow.md) |
| Check a change end to end before handoff | [Verify skill](../.agents/skills/verify/SKILL.md): static checks, a run in the game, and the matching reviewers in a loop |
| Turn a session into evidence for a decision | [Playtest findings log](playtests/findings.md) |
| Hand an implementer one change another crew can verify | [Playable change issue template](../.github/ISSUE_TEMPLATE/playable-change.md) |

## From a playtest to a design change

Write down what the players did, what they expected, and what happened. “We carried the crate to the fishing dock because that was where we first saw a boat” is more actionable than “the ferry is confusing.” A new possibility belongs on the roadmap or in a linked issue. Once the team chooses a direction, record the reason on the decisions page if it will affect several systems.

When implementing a mechanic, add or amend the page under `docs/mechanics/`. Describe the player’s goal, the action and its feedback, what the other player can do, who owns the resulting state, and what survives a restart. Include one ordinary playtest and one revealing edge case. The [crew orders spec](mechanics/crew-orders.md) shows how a single disconnect test can clarify both shared payouts and save behavior.

Use **playable** for player-facing behavior in the game, **preview** for an isolated Workbench or Saltwind demonstration, and **planned** for an accepted direction with work outstanding. Keep unsettled choices under **open questions**. When a feature lands, update the mechanic and its roadmap status in the same change. Keep tuning values in the mechanic spec and link back to it from design or milestone discussions.
