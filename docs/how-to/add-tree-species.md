# Add a tree species or variation

**Status: verified on 2026-11-22.**

A checklist for adding a species to the Highwood generator, or changing how an existing one looks. For a guided first attempt, follow the [tutorial](../tutorials/first-tree-species.md) instead. [Procedural flora](../craft/procedural-flora.md) explains the techniques behind each field.

## Add a species

1. **Pick a parent.** Choose the existing form closest in habit:
   - a tree, `TreeForm` in `src/assets/geometry/tree-species.ts`;
   - a mound, `MoundForm`;
   - fronds, `FrondForm`;
   - a snag or log, in `shrub-species.ts`.
2. **Write the form.** Export a new constant that spreads the parent (`...rowan`) and overrides what differs. Data files hold constants only: no function calls.
3. **Register it.** Add it to `treeSpecies` in `src/assets/trees/tree-catalog.ts`. The id string salts every random number, so **never rename an id once trees are placed**.
4. **Update the test list.** If it's a full-size tree (`budget: 'tree'`), add its id to the species list in `test/tree-species.test.mjs`, in the test named "trees keep their budgets…".
5. **Run the checks:**
   ```sh
   node --experimental-strip-types --test test/tree-species.test.mjs
   npm run quality:commit
   ```
6. **Review in the Workbench** under **Ecology → Plants → Highwood species**:
   - several seeds;
   - every age and exposure;
   - the silhouette from the front, beside its nearest look-alike species;
   - near beside far;
   - a licensed reference photo.
7. **Document it:**
   - a [field guide](../field-guide/highwood-plants.md) entry, with a divergence note for anything simplified;
   - its reference photos in `src/assets/geometry/tree-references.ts`, with licence, author and what to compare. A test requires at least one per species, and **Show reference photo** in the Workbench opens it;
   - a [references](../highwood-species.md) row;
   - placement rules in [Highwood habitats](../field-guide/highwood-habitats.md).
8. **Verify.** Run the [verify skill](../../.agents/skills/verify/SKILL.md), which includes the Art Director, Natural Systems and Knowledge Keeper reviews.

## Change how a species looks

When a new species looks too much like an existing one in the silhouette view, change its crown first: `crown.radius` for width, and `crown.clump` for rounder or flatter clumps. Then compare again from the front.

| To change… | Edit | Watch out for |
| --- | --- | --- |
| Height or girth | `height`, `trunk.radius` (per age) | Young trunks should be more slender than mature ones, not stouter. |
| Number of stems | `trunk.stems` | Stems plus limbs must fit within nine clumps; keep stems to four or fewer. |
| Crown width or where it starts | `crown.radius`, `crown.base` | A higher base shows more bare trunk. Birch needs about 40% clear. |
| Branch gesture | `crown.arc` (`rise`, `droop`, `lift`, `liftFrom`) | Set `liftFrom: 1` for tips that hang rather than lift. |
| Crown gaps | `crown.fork`, `crown.forkSpread` | More forks means more gaps, until the clump limit is reached. |
| Clump shape | `crown.clump` (`size`, `flatten`, `height`, `at`, `lift`) | Large clumps merge into a blob; check the silhouette. |
| Wind response | `exposure` | Exposed forms lean toward +x. |
| Colour and value | `bark`, `leaves.colors`, `underside`, `inner` | Keep each species in its own value band, and check the greyscale view. Albedo should stay above about 24% lightness. |
| Old age | `old.breakChance`, `old.flatten` | Willow-like species shouldn't snap. |
| Distant version | `far.masses`, `far.mass` | Lower `masses` if the far budget (160 for trees) is exceeded. |

## Add a seasonal or regional variation

Make a new species that spreads the original, give it its own id and name, and change only what differs. For example, a stunted ridge pine is `...scotsPine` with a lower `height` and stronger `exposure`. Prefer this over editing the original, because existing placements keep their look. Seasonal variation that changes over time is planned at runtime, not as separate species: see [#211](https://github.com/brylie/mission-island/issues/211).
