# Routing: where each kind of knowledge lives

Paths are relative to `docs/`. "Shape" names an entry shape from the [knowledge framework](../../../../docs/knowledge-framework.md#entry-shapes).

| Kind | Register | Home | Shape |
| --- | --- | --- | --- |
| A design choice and the options rejected | Rationale | `design/decisions.md` (append; supersede rather than edit) | Decision |
| A mechanic as the player meets it | Island | `mechanics/` | Reference |
| Tuning, contracts, budgets, data paths | Build | `architecture.md`, `craft/`, or the build section of the feature's page | Reference |
| A technique or algorithm, including what failed | Build and rationale | `craft/` | Craft |
| A species, weather pattern or season | Real | `field-guide/` | Entity |
| A habitat, site or landform | Real | `field-guide/` | Place |
| A process: fire, succession, grazing, windthrow, hydrology, erosion | Real | `explainers/` | Process |
| A job or practice: firefighting, farming, forestry, herding | Real | `field-guide/practices/` (create on first entry) | Practice, with *How it's organised* required |
| A social pattern: trust, reputation, dispute, division of labour | Real, **uncertain** by default | `field-guide/social/` (create on first entry) | Social pattern, with a divergence note always |
| First aid and other safety knowledge | Real, behind the safety gate | `field-guide/` | Practice plus a safety box |
| Something people commonly believe wrongly | Real and island | `misconceptions.md` | Misconception |
| Axes, units, island time, seeds, coordinates | Build | `conventions.md` | Reference |
| What players did and what confused them | Island | `playtests/findings.md` | Finding |
| A bug or process mistake worth learning from | Build | The craft page for that system, under *What failed* | Craft |
| A source behind a real claim | n/a | `sources.yaml` | Source record |
| A reference photo or other media for a model | n/a | Beside the model's data, as `tree-references.ts` is for Highwood species | Media record |
| How we work: tools, review roles, agent skills | Build | `README.md` (*Plan and test the next shift*), `playtests/review-workflow.md`, the skill itself | Reference |
| A place name, its origin, or a land-use history | Real | `field-guide/`, recording whose knowledge it is, and marking contested claims | Entity or place |
| A term a newcomer wouldn't know | Any | `field-guide/glossary.md`, real sense first | Glossary row |
| Something learned but not built | Any | The page it belongs on, marked **open question** or **planned**, and `open-questions.md` | Status footer |
| A guided activity for a class | Real | Expand a *Notice this* prompt into a short session on the entry's page | Optional |

## Handovers from other reviewers

Ask reviewers to hand over knowledge as tagged claims, one per line:

> **Claim** · register · source, or "from the code at `<commit>`" · suggested page

File each line through the table above. An untagged note is the hardest thing to file, so ask for tags when a handover arrives without them.
