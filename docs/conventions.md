# Conventions

**Status: reference. Last tended 2026-11-23.**

Shared rules for space, time and randomness that other pages assume. Link here instead of restating them.

## Space

- **Units.** Distances and sizes are in metres.
- **Axes.**
  - The game uses Babylon.js's left-handed axes, with **+y up**.
  - A ground position is written as an *(x, z)* pair in metres, for example the Fire Watch tower at (21, 36).
  - Heights come from the terrain at that point.
- **North and bearings.** North is **+z** and east is **+x**. The island has one north: true, grid and compass north are the same, with no magnetic declination. A bearing is in whole degrees clockwise from north, as in `src/spotting.ts`. See [spotting and ranging](field-guide/practices/spotting-and-ranging.md#where-the-island-differs) for how real compasses differ.
- **Slopes and batters.** A road's grade is a percentage: rise divided by horizontal distance. A batter's steepness is written **horizontal : vertical**, as in 1.5 horizontal : 1 vertical (about 34°): the bank runs 1.5 m out for every 1 m down. In code, `cutSlope` and `fillSlope` in `roadKinds` are that horizontal figure, so `fillSlope: 1.5` means 1.5 m out per 1 m down. Sources write ratios in different orders: the FAO road manual writes this slope both as a "rise: run ratio of 1:1.5" and as "1 : 1.5 (run over rise)" (`fao-road-design-watersheds`), and UK guidance writes "1 in 2" for 2 horizontal : 1 vertical (`fc-on025-forest-roads-tracks`). Read the words, not the order of the numbers. See [forest roads](field-guide/practices/forest-roads.md#cut-and-fill).
- **Model origin.** A model's origin sits where it meets the ground. For Highwood trees that's the base of the trunk. Trunks continue a little below the origin, so slopes never show a gap.
- **Downwind for Highwood templates.** Exposed trees and shrubs lean and stream toward their local **+x**. When placing one, turn it about **y** so +x points downwind. Fallen logs lie along local +x, with the root plate at the origin.

## Time

- **Island time.** One island day lasts 8 real minutes. Hours, such as "between 08:00 and 17:00", are island hours.
- **Dawn.** Many changes happen "at dawn", such as burn-scar recovery and extinguishers returning to their stands. A dawn passes once per island day.

## Randomness

- **Seeds** are whole numbers. The same seed and options always give the same result on every computer, so co-op players see the same world without sending it over the network.
- **Keyed streams.** Each part of a generated thing draws from its own stream, keyed by what it is. Changing one part doesn't reshuffle the rest. See [Procedural flora](craft/procedural-flora.md#seeded-keyed-randomness).
- **Stable ids.** A generator mixes a subject's id into its randomness. Renaming an id changes everything generated from it, so ids are permanent once something is placed.

## Wind

The island's wind follows the steady Windstone Ridge breeze, veering up to about 35° either side over a few days. It's a pure function of island time, so every screen agrees. See [Fire watch](mechanics/fire-watch.md#wind-dry-spells-and-burnt-ground).
