# Evaluation cases

Use these cases to check that the skill catches what it should. Each comes from a real review of PR #196. Give the skill the input, and compare its report with what it should catch.

## 1. An island claim inside a real section

**Input.** The wildfire explainer's *Fighting a fire* section ends:

> "Each position is reported as a bearing, so others can locate the fire on a map. The island's Fire Watch tower and fire finder do exactly this."

**Should catch:**
- **Mixed registers.** An island claim sits in a real section, which breaks "one field, one register".
- **A false likeness.** The island's fire finder gives a place name, bearing and distance from one tower; real lookouts cross bearings from two or more towers. That needs a divergence row.
- **Sourcing.** The real claim needs a source, found by search and opened.

## 2. Unsourced real claims

**Input.** A habitat card:

> "**Life.** Alder fixes nitrogen with bacteria in its root nodules, and enriches the soil. Siskins feed on alder seeds, otters den among alder roots, and damp deadwood feeds many insects."

**Should do:** for each claim, either:
- give a source that was opened, with a quote, an access date and a tier, recorded in `sources.yaml`; or
- mark it `unsourced` and name the source needed.

**Must not:** cite anything it didn't open, or present a claim as sourced from memory.

## 3. A stale cross-reference

**Input.** The habitats page footer says "Placement follows the generator in #196", while the PR description says the generator merged in #195.

**Should catch:** the wrong reference. It should fix it to #195, and leave alone the separate, correct mention of "the Natural Systems review of #196".

## 4. A tutorial over-claiming verification

**Input.** A tutorial stamped **verified** because its author ran the steps and the tests passed.

**Should catch:** under the framework, a tutorial is verified only when someone else completes it. The stamp should say who ran it, when and at which commit. It should also ask for an expected result at each step.
