# Mission Island design handbook

Mission Island is a third-person co-op game about two people making a home on a working island. One good session might end with three crates delivered. Another might end with a carrot harvest and the discovery of a path the crew has driven past a dozen times.

## Find the right page

| If you are asking… | Start here |
| --- | --- |
| What are we making, and what should a session feel like? | [Game design](game-design.md) and [creative direction and inspirations](design/creative-direction.md) |
| How do jobs teach practical skills and lead to later careers? | [Learning through island work](design/learning-and-careers.md) and the [Co-op Gameplay Designer skill](../.agents/skills/mission-island-coop-gameplay/SKILL.md) |
| What can we play today, and where is the crew going next? | [Playable features and roadmap](roadmap.md) and [the crew’s progression](design/progression.md) |
| Where should a feature, asset, or world edit go? | [Architecture and contribution guide](architecture.md) |
| How do I plan or review a feature across systems? | [Game Architect skill](../.agents/skills/mission-island-game-architect/SKILL.md) |
| What exactly happens when a player uses something? | [Starter chests and tools](mechanics/inventory.md), [charged throws](mechanics/throwing.md), [fishing](mechanics/fishing.md), [swimming and the shallows](mechanics/swimming.md), [farming and sales](mechanics/farming-and-market.md), [orders and pay](mechanics/crew-orders.md), [neighbor repairs](mechanics/neighbor-repairs.md), [the ferry terminal project](mechanics/ferry-terminal.md), and [the field journal](mechanics/field-journal.md) |
| What belongs at this location? | [Inhabited places](game-design.md#an-inhabited-island), [the two-island destination survey](living-world-qa.md), and [Saltwind’s site inventory](saltwind-island.md) |
| How should a place change with latitude, exposure, or time of year? | [Island climates and seasons](design/climate-and-seasons.md) |
| How do I review or improve the look of a model, place, or seasonal scene? | [Creative direction](design/creative-direction.md) and [Art Director skill](../.agents/skills/mission-island-art-director/SKILL.md) |
| How do I design or review generated sound and island ambience? | [Procedural Audio skill](../.agents/skills/mission-island-procedural-audio/SKILL.md) |
| How do we get variation that still makes sense? | [Generativity and the Juniper Hollow habitat](game-design.md#generativity) and [the Biome Composer workflow](../CONTRIBUTING.md#asset-workbench) |
| How do I review an ecological or procedural simulation? | [Natural Systems Reviewer skill](../.agents/skills/mission-island-natural-systems/SKILL.md) |
| How can I check the idea with another player? | [Fresh-save playtest through the first shared payout](playtests/starter-island-first-payout.md), [LAN play and saves](../README.md#play-on-your-local-network), [Workbench guide](workbench.md), and [Saltwind traversal and performance checks](saltwind-qa.md) |
| Why did we choose this, or where should a new idea go? | [Design decisions and open questions](design/decisions.md) |

## Plan and test the next shift

| When you need to… | Use |
| --- | --- |
| Choose what to build after the first payday | [Second-shift brief and acceptance playtest](design/second-shift.md) |
| Compare hauling with farming and fishing before pricing a repair | [Starter Island economy and pacing sheet](design/starter-economy.md) |
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
