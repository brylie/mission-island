# Routing: where each kind of knowledge lives

Paths are relative to `docs/`. "Shape" names an entry shape from the [knowledge framework](../../../../docs/knowledge-framework.md#entry-shapes). Each claim has one home. Other pages link to it rather than repeat it.

## The game

| Kind | Register | Home | Shape |
| --- | --- | --- | --- |
| A design choice and the options rejected | Rationale | `design/decisions.md` (append; supersede rather than edit) | Decision |
| A mechanic as the player meets it | Island | `mechanics/` | Reference |
| What players did and what confused them | Island | `playtests/findings.md` | Finding |
| Where the island departs from the real world | Real and island | A *divergence* note beside the entry it qualifies. Cases a player is likely to learn wrongly also go in `misconceptions.md` | Divergence |

## How it's built

| Kind | Register | Home | Shape |
| --- | --- | --- | --- |
| Tuning, contracts, budgets, data paths | Build | `architecture.md`, `craft/`, or the build section of the feature's page | Reference |
| Axes, units, island time, seeds, coordinates | Build | `conventions.md` | Reference |
| A technique or algorithm, including what failed | Build and rationale | `craft/` | Craft |
| A bug worth learning from | Build | The craft page for that system, under *What failed* | Craft |
| A guided first build for a newcomer, such as a first tree species | Build | Beside the craft page for that system | Tutorial: one path, a pinned commit and seed, an expected result at each step |
| A task for someone who already knows the system, such as adding a variation | Build | Beside the craft page for that system | How-to: starts from a real goal, with no teaching |
| How we work: tools, review roles, agent skills | Build | `README.md` (*Plan and test the next shift*), `playtests/review-workflow.md`, or the skill itself | Reference |
| A process mistake worth learning from | Rationale | `playtests/review-workflow.md`, with what we changed and why | Finding |

## The real world (field guide)

| Kind | Register | Home | Shape |
| --- | --- | --- | --- |
| A species, weather pattern or season | Real | `field-guide/` | Entity |
| A habitat, site or landform | Real | A card on the area's habitats page, such as `field-guide/highwood-habitats.md`. When it outgrows the card, it gets a full page in `field-guide/places/`, and the card stays as a short summary that links to it | Place |
| A process: fire, succession, grazing, windthrow, hydrology, erosion | Real | `field-guide/processes/` | Process |
| A job or practice: firefighting, farming, forestry, herding | Real | `field-guide/practices/` (create on first entry) | Practice, with *How it's organised* required |
| A social pattern: trust, reputation, dispute, division of labour | Real, **uncertain** by default | `field-guide/social/` (create on first entry) | Social pattern, always with a divergence note |
| Anything that tells a reader how to act in danger: first aid, fire, water, cold, poisonous plants | Real, behind the safety gate | The entry it belongs to | Its usual shape, plus a safety box |
| A place name, its origin, or a land-use history | Real | `field-guide/places/` or the area's habitats page, recording whose knowledge it is and marking contested claims | Place |
| Something people commonly believe wrongly | Real and island | `misconceptions.md` | Misconception |

## Across everything

| Kind | Register | Home | Shape |
| --- | --- | --- | --- |
| A source behind a real claim | n/a | `sources.yaml`. Search it before searching the web | Source record |
| A reference photo or other media for a model | n/a | Beside the model's data, as `tree-references.ts` is for Highwood species, with licence, author and credit | Media record |
| A term a newcomer wouldn't know | Any | `field-guide/glossary.md`, real sense first | Glossary row |
| Something learned but not built | Any | The page it belongs on, marked **open question** or **planned**, and `open-questions.md` | Status footer |
| A guided activity for a class | Real | Expand a *Notice this* prompt into a short session on the entry's page | Optional |

## When the table doesn't settle it

- **True of the world and of the island.** Write each claim in its own home, and link them with a divergence note. Don't merge them.
- **Summary and detail.** The detailed page owns the claim, and the summary links to it.
- **Nothing fits.** Log the claim in `open-questions.md` and propose a new row in your report. Don't create a new folder.
- **No folders by page type.** Organise by subject and register, never as `tutorials/` or `explainers/`.
- **One job per page.** Field-guide entries mix looking things up and explaining the same way every time, and that's intended. Split any other page that does two jobs: a tutorial that branches, for example, or a reference page that argues a case.

## Handovers from other reviewers

Ask reviewers to hand over knowledge as tagged claims, one per line:

> **Claim** · register (real, island, build or rationale) · source, or "from the code at `<commit>`" · suggested page

File each line through the tables above. An untagged note is the hardest thing to file, so ask for tags when a handover arrives without them.
