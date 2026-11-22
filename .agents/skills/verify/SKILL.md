---
name: verify
description: Verify a Mission Island change before handoff. Runs the static checks, plays the change in the game or Workbench, sends the diff to the matching Mission Island reviewers (art director, natural systems, co-op gameplay, playtest and accessibility, procedural audio, game architect), applies their findings and repeats until the reviews agree. Use when the user runs /verify, asks to "check", "verify", "review before PR" or "run the review loop", or after finishing an implementation step.
---

# Verify a Mission Island change

Use this skill in place of the bundled verify skill. It decides which reviews a change needs, runs them, fixes what they find and reports what was checked and what was not. Use the [shared review workflow](../../../docs/playtests/review-workflow.md) to pick the harness for each question.

Arguments are optional. A PR number, branch or commit range sets the target. Text after it, such as `focus on the gull flock`, narrows what the reviewers look at. Without arguments, review the working tree and the branch against `origin/main`.

## 1. Scope the change

1. Collect the diff of the requested target. Run `git fetch origin main` first, because a worktree's local `main` is often stale and would pull in work that has already merged.
   - No target: `git diff origin/main...HEAD` plus uncommitted changes.
   - A PR: `gh pr diff <number>`, or `gh pr view <number> --json headRefOid,baseRefName` and diff the base against that head. For a merged PR, diff its merge commit against its first parent.
   - A branch or commit range: `git diff origin/main...<branch>` or `git diff <range>`.

   To play or test a target that is not checked out, check it out in a separate worktree rather than reviewing the current checkout by mistake.

   List the files and summarize the player-visible effect in one or two sentences. Read the linked issue or PR when there is one, so the reviewers can judge the work against what was asked.
2. Pick the reviewers from the table. Include a reviewer when any row applies, and say in one line why each one was picked or skipped. When in doubt, include them.

| Reviewer skill | Include when the change… |
| --- | --- |
| [Game Architect](../mission-island-game-architect/SKILL.md) | is more than a copy or single-asset tweak. It always looks at the change as a whole: ownership, reuse, client and host boundaries, saves, and what the next feature will need. |
| [Art Director](../mission-island-art-director/SKILL.md) | adds or changes meshes, materials, shaders, particles, lighting, camera, UI layout, Workbench subjects or anything else players see (`*-view.ts`, `*-art.ts`, `*-scene.ts`, `*-meshes.ts`, `*-ui.ts`, `src/worlds/`). AGENTS.md requires this review for every visual artifact. |
| [Natural Systems](../mission-island-natural-systems/SKILL.md) | touches simulation, wildlife, flocking, habitat, weather, seasons, terrain, particles driven by physics or seeded randomness (`src/simulation/`, `gull-*`, `hare`, `biome-*`, `weather`, `terrain`, `juniper-habitat`, `island-phenomena`). |
| [Co-op Gameplay](../mission-island-coop-gameplay/SKILL.md) | changes jobs, rewards, missions, residents, interactions or roles (`server/`, `src/interactions/`, `jobs`, `*-repair`, `farm*`, `orders`, `src/residents/`). |
| [Playtest and Accessibility](../mission-island-playtest-accessibility/SKILL.md) | changes controls, camera, prompts, onboarding, feedback text, menus or anything a new player must notice. |
| [Procedural Audio](../mission-island-procedural-audio/SKILL.md) | touches `src/audio/` or adds a cause players should hear. |
| [Knowledge Keeper](../mission-island-knowledge-keeper/SKILL.md) | always runs, after the other reviewers so it can read their notes. It checks that design decisions, mechanics, architecture, tools, and the real-world knowledge behind the change (species, habitats, weather, first aid, practical skills) reached the knowledge base. For a copy-only change, it can report "nothing new" in one line. |

## 2. Run the static checks

If `node_modules` is missing, `package-lock.json` changed in the target, or `node_modules` is older than the lockfile, run `npm ci` first. Worktrees often keep dependencies from an older checkout, and a missing package makes lint fail before it checks anything. Then run `npm run quality:commit` (lint, type check, tests). Before a push or PR, also run `npm run quality:push` (full lint, unused code, build). When `server/` or `src/simulation/` changed, run `npm run coverage` as CI does. Fix failures before starting the reviews, because reviewers should not spend a round on a red build.

Static checks show the code holds together. They do not show the change works for players, so continue to step 3 even when they pass.

## 3. Exercise the change

Choose the smallest harness from the review workflow that can answer the question, then confirm in the game at player scale:

- **Host rules and state.** Add or extend a test that uses the [game test harness](../../../test/support/game-harness.mjs) and the real command path. Name the invariant it protects.
- **Scenarios.** Start the matching live checkpoint from the shell, for example `MISSION_ISLAND_CHECKPOINT=dock-fishing MISSION_ISLAND_CREW_SIZE=1 npm run playtest -- --port <free port>`. The [scenario table](../../../CONTRIBUTING.md#run-a-live-playtest-scenario) lists the IDs. When none starts close enough to the change, add one as the contributing guide describes. Use two browser contexts for co-op questions. Every browser that opens a checkpoint joins as a crewmate, so a reviewer cannot just look on. Start the crew size the review needs, and point reviewers at the harness tests for any seat they cannot drive themselves.
- **Assets and motion.** Run `npm run dev -- --port <free port>` and open the subject in `workbench.html`, then look at it from the usual gameplay camera at its real site.

Worktrees share the machine, so give each host a free port and read the printed URL. Use the in-app browser and capture screenshots or a short clip of what you checked. Save them in the scratchpad and pass their paths to the reviewers.

## 4. Run the reviews in parallel

Start one subagent per chosen reviewer in a single message so they run at the same time. Give each the same brief:

- the target (branch, range or PR), the file list and the one-line summary from step 1
- the reviewer skill to load and follow, by path
- the static check results and the captures or harness URLs from step 3, with the port of the running host
- what the user asked to focus on, if anything
- that the review is read-only: report findings, do not edit files

Ask each reviewer to return a verdict of **ready**, **revise** or **rethink**, findings ranked by severity with a file and line or a reproducible view, and a list of what it checked in the running game versus only read in code. A reviewer that cannot observe its claim should name the control, seed or readout that would let it.

## 5. Apply findings and repeat

1. Merge the findings. When reviewers disagree, such as an art request that costs the architecture, stop and ask the user to choose rather than picking silently.
2. Fix **revise** items. Treat a **rethink** as a design question for the user before rewriting.
3. Re-run the static checks and the harness from step 3. Send each change back to the reviewers who asked for it and to any other reviewer whose scope it touches. A fix that changes what players see always goes back to the Art Director, even if it approved the earlier version.
4. Treat a Knowledge Keeper **revise** like any other reviewer's: write the missing pages before handoff. The docs may outgrow the code, and that is expected.
5. Stop after the reviewers return **ready**, or after three rounds. At three rounds, report what is still open.

Record tool friction as the review workflow asks. Keep a harness or tooling improvement separate from the change under review.

## 6. Report

Finish with a short report:

- static checks run and their results
- what was exercised, and where (test name, scenario ID and crew size, Workbench link), with captures
- each reviewer's final verdict and what changed because of it
- the knowledge base pages added or updated, and any knowledge filed as a follow-up
- what remains unverified, such as a two-machine LAN run or a fresh human player

Put findings that belong outside this change in the relevant issue or the [playtest log](../../../docs/playtests/findings.md), or offer them as follow-up issues.
