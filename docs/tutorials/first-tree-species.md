# Grow your first tree species

**Status: run by its author on 2026-11-22, at commit `7ce7b35`.** Not yet completed by someone who didn't write it. That's what makes a tutorial verified, under the [knowledge framework](../knowledge-framework.md). If you're the first, note anything that tripped you up and update this line.

In this tutorial you'll add **hazel**, a multi-stemmed shrubby tree of woodland edges, to the Highwood species generator. You'll watch it grow in the Workbench, check that it reads as its own species, and write its field guide entry. It takes about an hour. You don't need to know how the generator works inside; [Procedural flora](../craft/procedural-flora.md) explains that when you're curious.

**You'll need:** the project running locally (see [CONTRIBUTING](../../CONTRIBUTING.md#set-up-a-development-host)) and a text editor. Start the game's dev server with `npm run dev`.

## 1. Look at the tree you'll start from

Hazel grows as a cluster of stems from the base, with a broad, rounded crown. That's close to grey willow, so we'll start from willow and change what's different.

Open the Workbench at `http://localhost:5173/workbench.html#highwood-species`. Choose **Species: Grey willow** and **Compare: Several seeds**. Notice:
- the several stems fanning from the base;
- the wide, soft mound of clumps;
- how each seed differs while still looking like willow.

**You should see** four low, wide, grey-green willows in a row, each with two to four stems.

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

**You should see** no errors from your editor. If it underlines `hazel`, check that the import line names it.

The text in quotes is hazel's **id**. Choose it carefully: the generator mixes the id into every random number, so renaming a species later would change every hazel already placed on the island.

## 4. Run the tests

```sh
node --experimental-strip-types --test test/tree-species.test.mjs
```

One test fails: it lists every full-size tree species and checks their budgets, and hazel isn't in the list. Open `test/tree-species.test.mjs`, find the line that lists `'scots-pine', 'birch', 'aspen', 'rowan', 'alder', 'willow'`, and add `'hazel'` at the end. Run the tests again.

**You should see** every test pass: `ℹ fail 0`.

Those tests just checked a lot for you:
- **Determinism.** Every age, exposure and twelve seeds build, and the same seed always gives identical geometry.
- **Budgets.** Both detail levels stay within their triangle budgets. Hazel uses about 760–1,120 near and up to 160 far.
- **Clumps.** Every crown has 3 to 9 clumps.
- **Ground.** The tree stands on the ground.

The exact counts from the author's run, at mature age: about 970–1,060 triangles near and 148–160 far.

## 5. See it grow

Reload the Workbench and choose **Species: Hazel**.

1. **Compare: Several seeds.** **You should see** four rounded, bushy, mid-green trees about 4–6 m tall. Their stems show only near the base, under a crown of lumpy clumps. They should be alike in kind but different in width, lean and clump layout.
2. **Compare: Every age, sheltered and exposed.** **You should see** six trees:
   - young hazel, small with two or three stems;
   - mature and old hazel, larger and rounder, and never with a broken top;
   - each exposed version leaning to the same side.
3. **Look: Silhouette**, then **Front**. **You should see** broad, lumpy black mounds on short stems. Switch **Species** to Grey willow and compare. The two are close, because both are many-stemmed and broad. That's a real difficulty in telling them apart at a distance, and the [how-to guide](../how-to/add-tree-species.md#change-how-a-species-looks) shows how to push them further apart.
4. **Compare: Near beside far.** **You should see** each far tree keep the same height, width and lean as its near partner, with fewer, blockier clumps.

Your hazel is finished when all four look like this. Tuning its shape further is in the [how-to guide](../how-to/add-tree-species.md#change-how-a-species-looks).

## 6. Optional: compare with a real hazel

This step is open-ended. Skip it if you just want the finished tree.

Find a whole-tree hazel photo on [Wikimedia Commons](https://commons.wikimedia.org/) with a CC licence. Open **Reference image**, paste the photo's File page, and compare stems, crown and colour side by side. The how-to guide's table says which field to change for each difference you notice.

## 7. Write it down

Add a hazel entry to the [field guide](../field-guide/highwood-plants.md), using the same headings as the other species. Two hazel facts to start your *Recognise it* and *How it changes* sections:
- **Catkins.** Its yellow male catkins, often called "lambs' tails", open in late winter, before the leaves.
- **Coppicing.** People have cut hazel to the base for centuries. It then sends up many straight new stems, used for hurdles, thatching spars and bean poles.

Check facts like these against a source and cite it. Add the photo to [Highwood species references](../highwood-species.md).

## What you learned

You described a species as data instead of code. The tests confirmed it fits the game's limits. You checked it the way the Art Director does: several seeds, a silhouette, the far version and a photo. And you recorded what you learned, which is part of the job.

Next: [Add a tree species or variation](../how-to/add-tree-species.md) is the short checklist for when you've done this before. [Procedural flora](../craft/procedural-flora.md) explains what every number does inside the generator.
