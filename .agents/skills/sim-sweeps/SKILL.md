---
name: sim-sweeps
description: Fast-forward Mission Island's host game across many seeds without rendering, then read the JSONL events and summary distributions or replay a recorded run. Use when asked to balance wildfires, regrowth, wildlife or weather, to "run a sweep", "simulate N days", check that a change is deterministic, or measure how often something happens across seeds.
---

# Sim sweeps

Use this skill to measure simulation and ecology balance instead of watching a browser. The full reference is in [docs/iteration-tooling.md](../../../docs/iteration-tooling.md#sim-sweeps).

## Run a sweep

```sh
npm run sim -- --scenario fire-watch --days 1 --seeds 1..100 --crew idle
```

- `--scenario` takes any live checkpoint ID. `fire-watch` starts a grass fire on Windstone meadow slope at 10:00.
- `--crew idle` measures the world on its own. `--crew scripted` sends a responder that walks straight at the nearest burning hotspot and sprays.
- Each island day costs about 15 s per seed per core; 100 one-day seeds take about 3 minutes. Start with `--seeds 1..10 --days 0.25` to check the setup, then run the full sweep in the background.

Expected output: `seed N · k/total` per finished seed on stderr, then `Wrote sims/<scenario>/events.jsonl, summary.json and recording.json for 100 seeds in … s.`

## Read the results

- `summary.json` → `sweep.perSeed` has distributions of fires started, spreads, located, extinguished, burned out and rained out, animal behaviour changes and weather changes. `sweep.perFire` has `hoursToLocate` and `fireHours`. `bySeed` lists each seed with its event digest.
- `events.jsonl` has one row per event with `seed`, `tick`, `day`, `hour` and `type`. Filter it with `jq`, for example `jq -c 'select(.type == "fire-spread")' sims/fire-watch/events.jsonl`.
- Report a distribution, such as the median and p90, rather than one seed. Name the scenario, days, crew and commit from the summary.

## Check determinism

```sh
npm run sim -- --replay sims/fire-watch/recording.json
```

It prints `Replayed N runs: all identical.` or names each seed that diverged and exits nonzero. Record before a refactor that should not change behaviour and replay after it. When a behaviour change is intended, say so and record a new baseline.

## When the runner is not enough

The runner covers host state only: no rendering, no client effects and one seat. Pair a balance finding with a capture of the same moment (see [capture-and-compare](../capture-and-compare/SKILL.md)) or a live checkpoint before handing it to the [Natural Systems](../mission-island-natural-systems/SKILL.md) reviewer.
