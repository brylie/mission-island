---
name: mission-island-knowledge-keeper
description: Review a Mission Island change for what it teaches and make sure the knowledge base keeps it. Covers design decisions, mechanics, architecture, tools and process, and the real-world knowledge behind the game, such as species, habitats, geology, geography, weather, seasons, first aid and practical skills. Use in every verify loop, after a design discussion or review that taught something, or when asked to document, explain or make the project useful for learning.
---

# Mission Island Knowledge Keeper

Mission Island's docs are a knowledge base, not only a manual. Students, teachers, parents, researchers, scientists, developers, designers and players should each find something useful, at their own level. A change is not finished until what it taught us is written down where the next person will look.

The documentation may be larger than the code, and that is fine. Code gets rewritten; the knowledge behind it lasts longer and is the project's most lasting contribution beyond the game. That includes why we chose a design, how a habitat works, and what a first-aid step is for. Never trim an accurate, useful explanation just to keep a change small. Do split long material into well-linked pages.

Start from the [design handbook](../../../docs/README.md), which maps the docs by question and by audience. Read the [field guide README](../../../docs/field-guide/README.md) for real-world entries, and the [learning brief](../../../docs/design/learning-and-careers.md) for how knowledge reaches players.

## What to look for

Read the diff, the linked issue or PR, and the review notes from other reviewers. List each piece of knowledge the change created or relied on, and check that it has a home:

| Kind of knowledge | Where it belongs |
| --- | --- |
| A product or design choice, and why we made it, including options we rejected | [Design decisions](../../../docs/design/decisions.md), or the design page for that area |
| How a mechanic works for the player, who owns its state, what survives a restart | The page under `docs/mechanics/` |
| How the code is organised, a contract another feature will build on, a performance budget | [Architecture](../../../docs/architecture.md), the owning module's comments, or a hand-over note linked from the PR |
| How to use or review something in the Workbench or a playtest | [Workbench guide](../../../docs/workbench.md) or `docs/playtests/` |
| A real-world fact the game draws on, such as a species, habitat, landform, weather or seasonal pattern, a first-aid step or a practical technique | The [field guide](../../../docs/field-guide/README.md), including what the game simplifies |
| A term a newcomer would not know | The [glossary](../../../docs/field-guide/glossary.md) |
| Something we learned but did not build | The relevant page, marked **planned** or **open question**, with the follow-up issue linked |

Reviews are rich sources. When the Art Director explains why a silhouette reads, or the Natural Systems reviewer explains how a species grows, check whether that reasoning reached the docs or stayed in a review transcript.

## How to judge an entry

- **Accurate.** Real-world claims cite a recognised source or are marked uncertain. A game simplification is labelled as one and never taught as fact.
- **Layered.** The opening lines work for a curious twelve-year-old. Detail, numbers and code references follow for those who want them.
- **Useful to more than one audience.** A field guide entry gives a teacher something to point at, a player something to notice, and a developer the data field that models it.
- **Findable.** Linked from the handbook map, the related design page and the code or data that implements it. Use the project's existing headings and terminology.
- **Current.** It matches what the code does now. It records playable, preview or planned status as the handbook defines them.

## Report

Return a verdict of **ready** or **revise**. List each missing or inaccurate piece of knowledge with the page and section it belongs in, and the source to use. Draft the missing text when it is short. Separate what must land with this change from what can follow in an issue. When the change taught nothing new, say so in one line.
