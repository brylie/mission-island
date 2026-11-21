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

### 2026-11-21 · shared journal · Mara’s outing through a host restart

- Starting point — Two isolated Brave sessions joined a disposable disk-backed island save at Mara’s dock. The scripted walkers followed the two routes using normal host movement input. Both read Mara’s clues in the same journal, and her carrot offer stayed available.
- Split visit — Crew 1 reached Shellglass and read the tide staff from the dry rim. Crew 2 read the Juniper cairn and recorded grazing in daylight. On arrival, each landmark received one general journal entry. Inspecting it added a confirmation to the same entry. Both browsers showed seven of eight outing observations and nine global XP before the rain.
- Return — Crew 1 returned to Mara for her acknowledgement and rain clue. Crew 2 walked down to the cairn, returned to the lookout in heavy rain, and recorded a sheltering hare. The rain reading on the saved observation was about 0.875.
- Recovery — Crew 2 reloaded the page. Both journals matched at eight of eight outing observations and ten global XP. The host process then stopped and restarted from the same save file. Both browsers rejoined with the same entries, clue state, observation details, and totals. The global tally includes the Pine forest discovery and the brown hare species entry.
- Capture — Crew 2’s journal after the host restart shows the full outing tally, global XP, and both crew slots connected. [Updated journal screenshot](../images/shared-journal-after-restart.png)
- Retest — Use the two-seat `field-outing` checkpoint to walk the route again. Use a disposable disk-backed save for a process restart. Clue-only navigation by first-time players remains unverified.

### 2026-11-21 · field-outing · A shared journal from the shore to Juniper

- Starting point — Two isolated Brave sessions joined the fresh `field-outing` checkpoint at 07:30. The walkthrough used scripted waypoints with normal host movement input, keyboard **E**, and the live journal buttons. Mara’s written clues contained landmarks and directions.
- Split route — Crew 1 followed the road through Seabrook and entered Shellglass along the Driftwood spur. The foxgloves stood on turf, and the dirt tread faded at the sand beside the wrack. Crew 1 stood on the dry rim to read the staff and record a limpet. Separating the limpet cluster from the staff let each prompt read clearly on approach.
- Juniper — Crew 2 walked the worn track between the cottages, passed the cairn and reached the clover lookout on foot. The approach went around the tree just uphill from the cairn. Crew 2 recorded a grazing hare around 08:44. In an earlier pass, the grazing prompt disappeared before the key press. Slower consumption and faster regrowth gave the final run time to read and record the behavior.
- Both screens — The first visit showed the same seven entries and seven observation XP. Crew 1 returned to Mara, who recognized the first record at Juniper and offered the rain clue. Crew 2 walked back down to the cairn and returned to the lookout during the shower. A sheltering hare earned the eighth record around 10:42, with both journals showing eight records and eight XP after Crew 2 reloaded.
- Capture — Crew 2’s journal after reconnect shows the eight-record tally alongside the two connected crew slots. [Journal screenshot](../images/field-outing-journal.png)
- Retest — Start `field-outing` with two seats. Give two new players only Mara’s clues and observe where they turn or stop. Navigation by first-time players remains unverified. The host test covers duplicate credit, stale observations, older saves and disk restart. [Field outing #51](https://github.com/brylie/mission-island/issues/51)

### 2026-11-21 · ridge-checkout · Pilot swap on Windstone Ridge

- Starting point: the `ridge-checkout` live checkpoint on an in-memory playtest host, two seats, an unqualified crew. A coding agent played both roles. Crew 1 ran in the in-app browser. Crew 2 started in a second browser tab, and a script on the same host took the seat over for the swap. Nobody new to the game took part.
- Moment: Crew 2 pressed **E** at the landing sign. Crew 1 borrowed the wing and flew with no input, then landed in the circle. The roles were then swapped: Crew 2 walked back up, borrowed the returned wing and flew the survey with a left bank followed by a right bank. Crew 2 then took a practice flight and disconnected 2.5 s after launch, 9.6 m up.
- Both screens: the teal meadow mark appeared for both crews and cleared on landing. Crew 1 saw the qualification receipt with "Wing returned to Windstone Ridge". The survey flight recorded the willow 3.5 s after launch and landed at (56.6, 105.4). The rack offered Crew 2 the survey without a checkout, and afterwards a practice flight. When Crew 2 disconnected, Crew 1 saw "Flight interrupted… Wing returned to Windstone Ridge."
- Outcome: Crew 2 rejoined standing at the launch (39.0, 128.0), with no flight in progress. The crew held one qualification and one survey, and the crew bank had not changed.
- Interpretation: the checkout, the shared qualification, the role swap and recovery from a mid-flight disconnect behave the same live as in the host tests. One quirk of the test setup: a browser tab that navigated away kept its seat until the tab was closed, so the takeover script was turned away as a duplicate. This looks like the page staying alive in the browser's back-forward cache. The game wasn't checked further for it.
- Decision: keep. Still untested: the uncoached preflight question with a new pilot, and a walk back after a short landing on purpose. A host restart wasn't tried live because the checkpoint host keeps no save; the disk-restart host test covers it. These stay on the [#52 checklist](https://github.com/brylie/mission-island/issues/52).
- Retest: two people on two devices. Ask the preflight question before the first launch, then swap roles as above.

### 2026-11-21 · ridge-soaring · Thermal chain to Juniper Hollow

- Starting point: the `ridge-soaring` live checkpoint, solo, with the crew qualified and the Mirror Pool survey done, on a dry day at 10:30. A coding agent flew it with a small in-page autopilot that read the game's own snapshots and held the real **A/D/S** keys. Nobody new to the game took part.
- Moment: the pilot launched and circled the Windstone shoulder, climbing from 11 m to 30 m. It then glided to the Fernfall ledges thermal (22 → 27 m), on to the Juniper slope ridge lift (13 → 24 m), and passed over Juniper Hollow.
- Both screens: solo. The HUD showed height, the nearest lift with its bearing and distance, and the next unsurveyed place. It flashed "Mirror Pool spotted from the air" on the way out.
- Outcome: the pilot landed safely at (−45, 72). The receipt read "Aerial survey recorded: Mirror Pool, Fernfall, Juniper Hollow · 3/6 for the crew. Wing returned to Windstone Ridge."
- Interpretation: the lift chain works at play speed and the survey loop reads clearly. While airborne, the "n/6" count includes places spotted on the current flight but not yet recorded. The sighting message says a safe landing is still needed, but a player may read the count as already saved. Hypothesis to check with a person.
- Decision: keep, and observe again with a person. Next questions: can a new pilot find the rising air from the motes and the HUD bearing alone? Does circling with **S** held feel natural? Is a single afternoon long enough to reach Shellglass?
- Retest: on the `ridge-soaring` checkpoint, ask a pilot to survey Juniper Hollow without directions. Record where they first climbed and how long it took.

### 2026-11-21 · village-favors · Bram hidden behind the job board

- Starting point — `village-favors` checkpoint, solo agent session in the browser. 09:30 after the starter shift, carrying two fish and two carrots.
- Moment — Bram's first tally spot was 1.5 m from the job board, on the yard side. From the default camera behind the crew, Bram stood in front of the board, and the board's larger aim target took the reticle every time it crossed him. His label also overlapped the board's.
- Both screens — Solo. A bare **E** opened the board as intended, but there was no way to aim at Bram.
- Outcome — Moved the tally spot 2.5 m east of the board. Both labels now read in full, and a crewmate standing at the board is out of Bram's talking range, so the two never compete.
- Interpretation — A resident's spot needs its own line of sight from where players approach, not just walkable ground.
- Decision — Keep the new spot. The agreement button, the bay and the hand-in all worked from real clicks and **E** presses: staging the crate paid `+5 coins · Stage a load for Bram · Crew bank · Bram trust +1`, and handing Mara two carrots changed her greeting to the tide-pool clue. Aiming was skipped by sending the talk choice over the page's own socket after the camera swung into a wall.
- Retest — Two people at the depot: one aims at Bram from the road while the other stands at the board. Pass: each gets their own prompt without moving.

### 2026-11-21 · materials-checkout · Ferry Approach Edging

- Two isolated Chromium contexts joined the `materials-checkout` checkpoint. The scripted walk followed Meadow Slope Path to the windfall and Beach Trail past Driftwood Beach and Shellglass Tide Pool to the stone. The small branch and loose stone each had a diamond-shaped marker, a name and an **E** prompt. Each crewmate returned one sample and both earned the qualification.
- In both runs, the players split gathering. After the first delivery, the returning crewmate still carried one unit and the Crew guide showed one remaining. Both browsers sent a final **E** command. Each saw one 5-coin award, and only one pocket lost a unit. On the return to the site, the timber rail or the row of stones was visible against the gravel and the label read **Repaired**.
- The host tests cover both timber and stone solo, co-op reconnect after the first section, simultaneous final delivery, and reload from a disk save with the completed edging, one award and both sources still available. The browser walk used scripted directions. Human landmark recognition remains on the [#52 checklist](https://github.com/brylie/mission-island/issues/52).

## Triage after the session

Give joining failures, lost progress and incorrect bank entries first attention. If a passenger misses a payment, record the two displayed balances before filing. Different balances call for a synchronization or save test. Matching balances and a surprised passenger call for a feedback test. Hear each player’s explanation before sharing the other person’s answer.

Link to an existing issue where its acceptance playtest covers the finding. File a regression against the earlier change if an accepted behavior has broken. For something new, use the [playable change template](../../.github/ISSUE_TEMPLATE/playable-change.md) and the [Starter Island milestone](https://github.com/brylie/mission-island/milestone/4). Use [#49](https://github.com/brylie/mission-island/issues/49) for first-day orientation history, [#50](https://github.com/brylie/mission-island/issues/50) for payout clarity and hauling, and [#52](https://github.com/brylie/mission-island/issues/52) for repair pacing and persistence. Close the loop by recording what the next crew did on the changed build.
