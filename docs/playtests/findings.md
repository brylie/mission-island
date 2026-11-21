# Starter Island playtest findings

Keep observations from actual sessions here. The [first-payday guide](starter-island-first-payout.md) sets up the opening, the [second-shift brief](../design/second-shift.md) tests what brings players back, and the [economy sheet](../design/starter-economy.md) holds timings and bank arithmetic.

## Session log

For each session, copy the block below. Give each distinct observation a short title so an issue can link to it. Record a moment that worked as carefully as one that blocked progress. Use player roles or aliases.

```markdown
### YYYY-MM-DD · Session ID · Short finding title

- Starting point — build, save slot or relevant state, crew size, prior experience, roles.
- Moment — elapsed time, location, what the players tried, and their words if quoted exactly.
- Both screens — what the acting player saw and what the partner saw. For a solo test, say so.
- Outcome — what happened next, hint or workaround used, and time to recover.
- Interpretation — what the crew expected. Mark a possible cause as a hypothesis.
- Decision — keep, change, investigate, or observe again. Record why and link the milestone issue if opened.
- Retest — setup, observable pass condition, owner if assigned, and result/build when repeated.
```

### 2026-11-21 · village-favors · Bram hidden behind the job board

- Starting point — `village-favors` checkpoint, solo agent session in the browser. 09:30 after the starter shift, carrying two fish and two carrots.
- Moment — Bram's first tally spot was 1.5 m from the job board, on the yard side. From the default camera behind the crew, Bram stood in front of the board, and the board's larger aim target took the reticle every time it crossed him. His label also overlapped the board's.
- Both screens — Solo. A bare **E** opened the board as intended, but there was no way to aim at Bram.
- Outcome — Moved the tally spot 2.5 m east of the board. Both labels now read in full, and a crewmate standing at the board is out of Bram's talking range, so the two never compete.
- Interpretation — A resident's spot needs its own line of sight from where players approach, not just walkable ground.
- Decision — Keep the new spot. The agreement button, the bay and the hand-in all worked from real clicks and **E** presses: staging the crate paid `+5 coins · Stage a load for Bram · Crew bank · Bram trust +1`, and handing Mara two carrots changed her greeting to the tide-pool clue. Aiming was skipped by sending the talk choice over the page's own socket after the camera swung into a wall.
- Retest — Two people at the depot: one aims at Bram from the road while the other stands at the board. Pass: each gets their own prompt without moving.

## Triage after the session

Give joining failures, lost progress and incorrect bank entries first attention. If a passenger misses a payment, record the two displayed balances before filing. Different balances call for a synchronization or save test. Matching balances and a surprised passenger call for a feedback test. Hear each player’s explanation before sharing the other person’s answer.

Link to an existing issue where its acceptance playtest covers the finding. File a regression against the earlier change if an accepted behavior has broken. For something new, use the [playable change template](../../.github/ISSUE_TEMPLATE/playable-change.md) and the [Starter Island milestone](https://github.com/brylie/mission-island/milestone/4). Use [#49](https://github.com/brylie/mission-island/issues/49) for first-day orientation history, [#50](https://github.com/brylie/mission-island/issues/50) for payout clarity and hauling, and [#52](https://github.com/brylie/mission-island/issues/52) for repair pacing and persistence. Close the loop by recording what the next crew did on the changed build.
