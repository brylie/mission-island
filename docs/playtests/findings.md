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

### 2026-11-21 · ridge-checkout · Pilot swap on Windstone Ridge

- Starting point: the `ridge-checkout` live checkpoint on an in-memory playtest host, two seats, an unqualified crew. A coding agent played both roles. Crew 1 ran in the in-app browser. Crew 2 started in a second browser tab, and a script on the same host took the seat over for the swap. Nobody new to the game took part.
- Moment: Crew 2 pressed **E** at the landing sign. Crew 1 borrowed the wing and flew with no input, then landed in the circle. The roles were then swapped: Crew 2 walked back up, borrowed the returned wing and flew the survey with a left bank followed by a right bank. Crew 2 then took a practice flight and disconnected 2.5 s after launch, 9.6 m up.
- Both screens: the teal meadow mark appeared for both crews and cleared on landing. Crew 1 saw the qualification receipt with "Wing returned to Windstone Ridge". The survey flight recorded the willow 3.5 s after launch and landed at (56.6, 105.4). The rack offered Crew 2 the survey without a checkout, and afterwards a practice flight. When Crew 2 disconnected, Crew 1 saw "Flight interrupted… Wing returned to Windstone Ridge."
- Outcome: Crew 2 rejoined standing at the launch (39.0, 128.0), with no flight in progress. The crew held one qualification and one survey, and the crew bank had not changed.
- Interpretation: the checkout, the shared qualification, the role swap and recovery from a mid-flight disconnect behave the same live as in the host tests. One quirk of the test setup: a browser tab that navigated away kept its seat until the tab was closed, so the takeover script was turned away as a duplicate. This looks like the page staying alive in the browser's back-forward cache. The game wasn't checked further for it.
- Decision: keep. Still untested: the uncoached preflight question with a new pilot, and a walk back after a short landing on purpose. A host restart wasn't tried live because the checkpoint host keeps no save; the disk-restart host test covers it. These stay on the [#52 checklist](https://github.com/brylie/mission-island/issues/52).
- Retest: two people on two devices. Ask the preflight question before the first launch, then swap roles as above.

## Triage after the session

Give joining failures, lost progress and incorrect bank entries first attention. If a passenger misses a payment, record the two displayed balances before filing. Different balances call for a synchronization or save test. Matching balances and a surprised passenger call for a feedback test. Hear each player’s explanation before sharing the other person’s answer.

Link to an existing issue where its acceptance playtest covers the finding. File a regression against the earlier change if an accepted behavior has broken. For something new, use the [playable change template](../../.github/ISSUE_TEMPLATE/playable-change.md) and the [Starter Island milestone](https://github.com/brylie/mission-island/milestone/4). Use [#49](https://github.com/brylie/mission-island/issues/49) for first-day orientation history, [#50](https://github.com/brylie/mission-island/issues/50) for payout clarity and hauling, and [#52](https://github.com/brylie/mission-island/issues/52) for repair pacing and persistence. Close the loop by recording what the next crew did on the changed build.
