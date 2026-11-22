---
name: capture-and-compare
description: Render Mission Island hero views, Workbench specimens and debug overlays headlessly, then compare two revisions with a pixel-difference heatmap. Use when asked to "capture", "screenshot the island", "compare before and after", "turntable", "silhouette or value check", or whenever a landscape, model, lighting or overlay change needs visual evidence without a person driving the browser.
---

# Capture and compare

Use this skill to produce reproducible visual evidence for landscape, ecology, model and lighting work. The full reference is [docs/iteration-tooling.md](../../../docs/iteration-tooling.md).

## Before you start

- Run `npm ci` if `node_modules` is missing or older than the lockfile. Playwright needs its browser once: `npx playwright install chromium`.
- No dev server is needed. `npm run capture` starts its own Vite host on a free port.

## Capture

1. Pick presets from `src/assets/recipes/capture-presets.ts`, or add one there as data. Give a landscape preset an `eye` and a `look` point in map metres, with heights above the ground.
2. Render:

   ```sh
   npm run capture -- --preset tower-dawn-north,ridge-to-harbor
   ```

   With no `--mode` you get colour, greyscale and silhouette. Add `--hour`, `--weather` or `--seed` to vary a preset, and `--overlay slope,wildfire` to draw debug layers.
3. For a model or plant, run a specimen preset with `--grid`. It renders each of the preset's seeds at eight angles and writes `captures/<preset>/<preset>-turntable-<mode>.png`.
4. Read the output. Each PNG has a JSON sidecar with the camera, hour, weather, seed, commit and perf numbers. `captures/index.html` shows the newest capture of each preset.

Expected output: one line per capture on stderr, such as `captures/ridge-to-harbor/ridge-to-harbor-color.png · 41 fps · 612 draws`, then `Wrote N captures to captures and captures/index.html`.

## Compare

```sh
npm run capture -- --compare main,HEAD --preset ridge-to-harbor
```

Each side can be a capture folder or a git ref. A ref is rendered from a detached worktree in `captures/.revisions/`. The sheets go to `captures/compare/<before>-vs-<after>/`, and `compare.json` gives the share of changed pixels per sheet. Look at the heatmap before reading the numbers: a lighting change lights up the whole frame, and a model change lights up a silhouette.

## Hand off

- Look at every image you hand off. Pass the PNG paths to the [Art Director](../mission-island-art-director/SKILL.md) and say which preset, mode and commit each came from.
- Quote perf numbers only against another capture from the same machine. Headless Chromium renders with software WebGL.
- If a capture fails with a dev view error, the message names the bad parameter. Fix the preset rather than retrying.
