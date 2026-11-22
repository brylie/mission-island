# Grow your first tree species

**Status: verified** against the generator on 2026-11-22: the steps were run, and the tests passed.

In this tutorial you'll add **hazel**, a multi-stemmed shrubby tree of woodland edges, to the Highwood species generator. You'll watch it grow in the Workbench, check that it reads as its own species, and write its field guide entry. It takes about an hour. You don't need to know how the generator works inside; [Procedural flora](../craft/procedural-flora.md) explains that when you're curious.

**You'll need:** the project running locally (see [CONTRIBUTING](../../CONTRIBUTING.md#set-up-a-development-host)) and a text editor. Start the game's dev server with `npm run dev`.

## 1. Look at the tree you'll start from

Hazel grows as a cluster of stems from the base, with a broad, rounded crown. That's close to grey willow, so we'll start from willow and change what's different.

Open the Workbench at `http://localhost:5173/workbench.html#highwood-species`. Choose **Species: Grey willow** and **Compare: Several seeds**. Notice:
- the several stems fanning from the base;
- the wide, soft mound of clumps;
- how each seed differs while still looking like willow.

## 2. Describe hazel as data

Every species is a plain table of numbers and colours in `src/assets/geometry/tree-species.ts`. Open it and add this at the end:

```ts
export const hazel: TreeForm = {
  ...willow,
  name: 'Hazel',
  height: { young: [2, 3], mature: [4, 6] },
  trunk: { ...willow.trunk, stems: { young: [2, 3], mature: [3, 4] }, stemLean: 0.35 },
  crown: { ...willow.crown, radius: { young: 0.36, mature: 0.4 }, clump: { ...willow.crown.clump, flatten: 0.25, height: 0.75 } },
  bark: { lower: '#6b5a4a', upper: '#8a7562', transition: 0.3 },
  leaves: { colors: ['#4f7440', '#62884c', '#7c9d5e'], underside: 0.72, inner: 0.84 },
  old: { breakChance: 0, flatten: 0.1 },
}
```

What each line does:

- `...willow` copies every willow value, so you only write what's different.
- **height** is in metres, as a range. Each seed picks a height within it.
- **stems** gives two or three stems when young and three or four when mature. Don't go higher: a crown is limited to nine foliage clumps, and every stem's top uses one.
- **crown.clump** makes clumps a little rounder and taller than willow's flat mounds.
- **bark** sets warm, grey-brown colours for hazel's smooth, shiny stems.
- **leaves** sets three greens, from shaded to sunlit. Hazel is a mid green, brighter than willow's silvery grey.
- **old** says that an old hazel never snaps at the top. Old hazels are coppiced or simply grow more stems.

## 3. Add hazel to the catalog

Open `src/assets/trees/tree-catalog.ts`. Add `hazel` to the import from `tree-species.ts`, and add a line to the `treeSpecies` list after willow:

```ts
  'hazel': hazel,
```

The text in quotes is hazel's **id**. Choose it carefully: the generator mixes the id into every random number, so renaming a species later would change every hazel already placed on the island.

## 4. Run the tests

```sh
node --experimental-strip-types --test test/tree-species.test.mjs
```

One test fails: it lists every full-size tree species and checks their budgets, and hazel isn't in the list. Open `test/tree-species.test.mjs`, find the line that lists `'scots-pine', 'birch', 'aspen', 'rowan', 'alder', 'willow'`, and add `'hazel'` at the end. Run the tests again. They should all pass.

Those tests just checked a lot for you:
- **Determinism.** Every age, exposure and twelve seeds build, and the same seed always gives identical geometry.
- **Budgets.** Both detail levels stay within their triangle budgets. Hazel uses about 760–1,120 near and up to 160 far.
- **Clumps.** Every crown has 3 to 9 clumps.
- **Ground.** The tree stands on the ground.

## 5. See it grow

Reload the Workbench and choose **Species: Hazel**.

1. **Compare: Several seeds.** Do they look like one species, but not copies?
2. **Compare: Every age, sheltered and exposed.** See the young and old forms and the wind-bent ones.
3. **Look: Silhouette**, then **Front**. Is hazel a different black shape from willow and rowan? If it looks just like willow, widen its crown or make its clumps rounder, and look again.
4. **Compare: Near beside far.** Does the distant version keep the same outline?

## 6. Compare with a real hazel

Find a whole-tree hazel photo on [Wikimedia Commons](https://commons.wikimedia.org/) with a CC licence. Open **Reference image**, paste the photo's File page, and compare stems, crown and colour side by side. Adjust the data and reload until you're happy.

## 7. Write it down

Add a hazel entry to the [field guide](../field-guide/highwood-plants.md), using the same headings as the other species. Two hazel facts to start your *Recognise it* and *How it changes* sections:
- **Catkins.** Its yellow male catkins, often called "lambs' tails", open in late winter, before the leaves.
- **Coppicing.** People have cut hazel to the base for centuries. It then sends up many straight new stems, used for hurdles, thatching spars and bean poles.

Check facts like these against a source and cite it. Add the photo to [Highwood species references](../highwood-species.md).

## What you learned

You described a species as data instead of code. The tests confirmed it fits the game's limits. You checked it the way the Art Director does: several seeds, a silhouette, the far version and a photo. And you recorded what you learned, which is part of the job.

Next: [Add a tree species or variation](../how-to/add-tree-species.md) is the short checklist for when you've done this before. [Procedural flora](../craft/procedural-flora.md) explains what every number does inside the generator.
