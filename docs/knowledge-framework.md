# Knowledge framework

**Status: adopted for new pages.** Existing pages move over as they're next edited.

Mission Island keeps two kinds of documentation side by side:
- **Game design documents** say what we're making and how it plays: the design pages and mechanic specs.
- A **knowledge base** says what we learned while making it: the real world we draw on, the techniques we use, and the reasons behind our choices.

This page sets out how the two are organised, so a reader knows what kind of page they're on and a writer knows where something belongs. The [handbook](README.md) maps the pages by question and by audience, and the [Knowledge Keeper](../.agents/skills/mission-island-knowledge-keeper/SKILL.md) checks new work against this framework in every review.

## Three questions for every page

### 1. What does the reader need right now?

We use [Diátaxis](https://diataxis.fr/), which sorts documents by the reader's need:

| Type | The reader wants to… | Mission Island examples | Folder |
| --- | --- | --- | --- |
| **Tutorial** | learn by doing, guided step by step | [Grow your first tree species](craft/first-tree-species.md) | `docs/tutorials/` |
| **How-to guide** | get a task done they already understand | [Add a tree species or variation](craft/add-tree-species.md) | `docs/how-to/` |
| **Reference** | look something up | [Field guide](field-guide/README.md) entries, [glossary](field-guide/glossary.md), budgets and data tables, [Workbench guide](workbench.md) | `docs/field-guide/`, and pages beside the code they describe |
| **Explanation** | understand why | Field guide [process and place pages](field-guide/README.md) on deep topics, and the [craft pages](craft/README.md) on techniques | `docs/field-guide/processes/`, `docs/field-guide/places/`, `docs/craft/` |

The game design documents sit alongside these four:
- [product and game design](game-design.md) and the [design pages](design/);
- [mechanic specs](mechanics/);
- [design decisions](design/decisions.md).

They are the team's working plan, and the knowledge base explains and teaches from them.

A field guide entry mixes reference and explanation on purpose. It is organised by subject (a species, a habitat) rather than by task. Every entry uses the same headings, so a reader learns its shape once.

### 2. Whose truth is this?

Every statement belongs to one **register**:

| Register | True of | Example | Test |
| --- | --- | --- | --- |
| **Real** | The world, outside the game | "Alder fixes nitrogen with bacteria in its root nodules." | Would it still be true if the game were cancelled? Cite a source. |
| **Island** | What a player can see and do | "Alder and grey willow line Mirror Pool, with no pine." | Can a player observe it? No code or tuning numbers. |
| **Build** | How we implement it | "Exposed templates lean toward +x; 45% of sheltered junipers are vases." | Belongs in craft, architecture or a data table. |
| **Rationale** | Why we chose it | "Far trees may use 160 triangles because one-ring masses popped at the switch." | Belongs in [decisions](design/decisions.md). Record it once, and supersede it rather than editing it. |

**One field, one register.** When a heading starts holding two registers, split it. When the island departs from the real world, say so in a **divergence** note:
- what is real;
- what the island does;
- why we chose that;
- what a player might wrongly learn.

A labelled simplification teaches. An unlabelled one misinforms.

### 3. How settled is it, and how fresh?

Every page or entry carries a status: **Open question**, **Planned**, **Preview** (Workbench only), **Playable** (in the game), or **Verified** (checked against the code now, with the check named, such as a test, a Workbench seed or a measurement). Beside the status, give a **last tended** date: the status says how finished an entry is, and the date says how fresh it is. Put issue and PR links for unfinished work in a status footer, not in the body.

### 4. What is the model for?

Every page that describes a modelled system, such as a craft page, an explainer's island section or a divergence note, states the model's **purpose**:
- **Illustrate:** make an idea visible and playable, such as fire as a crew job or flocking as group behaviour.
- **Explain:** reproduce the real causes, so a player can learn why something happens.
- **Predict:** match real outcomes closely enough to forecast them. Mission Island rarely aims for this.

A model built to illustrate is judged differently from one built to predict. Divergence notes list the real patterns the model **misses** as well as the ones it reproduces, so a reader can see its limits.

## Entry shapes

Use one shape per kind of subject. Don't invent a new one per topic.

- **Place:** a habitat, site or landform. Headings: *What you see · Why here · What changes it · Life · In the game · Notice this · Sources.* A place card is shorter than an entity entry, because its plants and animals have their own entries.
- **Entity:** a species, weather pattern or season. Headings: *Recognise it · Where it lives · How it changes · Life around it · In the game · Notice this · A resident might say · Sources.*
- **Process:** fire, succession, grazing, windthrow, hydrology, erosion. Headings: *What drives it · Where it shows on the island · Timescale · What it leaves behind · Who deals with it · In the game · Sources.* Processes get explainers, because they cut across habitats.
- **Practice:** firefighting, farming, first aid, knot-tying, building. Headings: *What the job is · Skills and kit · What goes wrong · How it's organised · In the game · Notice this · Sources.* *How it's organised* covers crews, training, licences and mutual aid. It's where a skill becomes a job.
- **Social pattern:** trust, reputation, dispute, division of labour. Headings: *The pattern · Why it happens · What you'd observe · In the game · What we flatten · Sources.* Mark claims **uncertain** unless a strong source supports them. Contested social science needs a stricter honesty test than ecology.
- **Craft:** an algorithm or technique. Headings: *Goal · Technique · Why it works · What failed · Cost and limits · Where it lives · How to check it.*
- **Decision:** a row in [decisions](design/decisions.md). Columns: *Context and choice · Reason and consequence · What we rejected · Where to follow it.*

**Before game text.** Before a resident line, journal note or prompt quotes a real-world figure, check it against a source specific to that subject, such as a species account for a flowering month or lifespan. Field guide and explainer sources are a starting point, not a check.

**Verifying a tutorial.** A tutorial is **verified** only when someone who didn't write it has completed it from a clean checkout. Until then, stamp it with who ran it, when, and at which commit.

**Older pages.** This framework applies to new pages and to older ones when they're next edited. An older page that still uses a previous shape should say so in its status line.

## Laws

1. **One document, one job.** If a draft wants to be a tutorial and an explainer, write two pages and link them.
2. **A simplification is never taught as fact.** Anything in *In the game* that departs from the real entry gets a divergence note.
3. **Measured, not remembered.** Island and build claims come from the code or the Workbench, at a named seed or test.
4. **Nothing is thrown away.** Failed techniques, rejected options and superseded decisions are content.
5. **Real pages stand without the game.** A field guide entry or explainer should still be worth reading for someone who never plays.
6. **Every review handover lands.** Each expert reviewer's reasoning becomes a claim on a page.
7. **No orphans.** Every subject in the world has an entry, and every page is reachable from the handbook.

## Shared pages

- [**Sources register**](sources.yaml) records every source behind a real claim: URL, access date, tier, a short supporting quote, and whether anyone has opened it.
- **Reference photos** used to shape a model live beside that model's data, with licence and author. For example, `src/assets/geometry/tree-references.ts` holds the Highwood species references, and the Workbench's **Show reference photo** opens them.
- [**Conventions**](conventions.md) defines axes, units, island time and seeds once.
- [**Misconceptions**](misconceptions.md) gathers what play might wrongly teach, and how we counter it.
- [**Open questions**](open-questions.md) indexes sources to find, work planned and questions to answer.
- **Further reading** on a page is at most five works, none used as a source, each noted for a *young reader*, *teacher* or *researcher*.

The [Knowledge Keeper](../.agents/skills/mission-island-knowledge-keeper/SKILL.md) defines what **verified** means for each document type, and how web search may be used. Search only to check and source claims, never to invent them.

## Prior art

Each piece of this framework borrows from an established practice. The combination is our own.

| What we do | Borrowed from |
| --- | --- |
| Divergence notes, model purpose, listing missed patterns | The [ODD protocol](https://www.jasss.org/23/2/7.html) for describing agent-based models, whose motto is to describe what the program does, not what you think the model does. [ODD+D](https://www.sciencedirect.com/science/article/abs/pii/S1364815213001394) extends it to human decisions. |
| Craft pages that record testing and failed attempts | [TRACE](https://www.sciencedirect.com/science/article/abs/pii/S0304380014000611), a framework for documenting model development, testing and analysis. |
| Append-only decision records, superseded rather than edited | Architecture decision records, as in the [GDS Way](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html). |
| Status and last-tended dates | Digital gardens, which label notes by maturity and date ([Maggie Appleton](https://maggieappleton.com/garden-history)). |
| Species entries organised by recognition, ecology and fire | The US Forest Service [Fire Effects Information System](https://research.fs.usda.gov/feis/about/tutorial). |
| Saying what a model is for and where it misleads | [Model cards](https://arxiv.org/abs/1810.03993) for machine-learning models. |
| Field guide prompts and resident lines as a debrief | A [study of the game *Eco*](https://pmc.ncbi.nlm.nih.gov/articles/PMC6930897/) that recommends a debrief to clear up misconceptions. It was a small study of seven players on a beta, so treat it as suggestive. |

We found no existing game knowledge base that separates real, island and rationale claims as structure. That separation is our own synthesis, and it may need revising as we use it.

## Where does this go?

1. **Is it true outside the game?** Field guide or explainer (Real), plus a divergence note if the island differs.
2. **Did we decide, build or measure it?** A decision, craft page, architecture note, mechanic spec or playtest record.
3. **Haven't we built it yet?** The page it would live on, marked **planned**, with the issue in the status footer.

If something is both, such as heather burning as a real land-management practice and a fire the crew fights, write both, and connect them with a short paragraph and a link. Don't merge them.
