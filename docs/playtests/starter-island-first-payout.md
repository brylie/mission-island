# Starter Island playtest · First shared payout

**Read this aloud to the crew**

“Start an island together and earn your first coins. Tell each other what you’re trying as you go.”

Stop after the first payment and give each player a chance to say what happened. The question for this session is whether two newcomers can find useful roles and recognize what they earned together.

## Before either player joins

Use two computers on the same Wi-Fi, one browser per player. Give the less familiar player first choice of role. One of you can jot down a few words during natural pauses. Keep the hints below folded until someone asks for help, then record the first hint that got them moving.

The host needs a **new named save on an unused port**. An empty bank alone can also belong to a well-traveled crew. From a checkout with dependencies installed, this example creates a dated slot and leaves the usual server available. If port 5176 is busy, choose another free port. [LAN and save instructions](../../README.md#play-on-your-local-network)

```sh
MISSION_ISLAND_SAVE="first-payout-$(date +%Y%m%d-%H%M%S)" npm run dev -- --host 0.0.0.0 --port 5176 --strictPort
```

Record the build (`git rev-parse --short HEAD`), port, save slot, and which players have played before. Start the timer when the host opens the game. Use **Harbor delivery**, **0 / 3 delivered**, and **Crew bank · 0 coins** as the starting checkpoint. Keep other earnings and purchases for after the debrief.

## What to watch while playing

| Moment | What to notice |
| --- | --- |
| Meet up | How does the host get the other player into the same island? Can each choose a name or skip, see **2 / 2**, and point out their crewmate? Write down any address they try that leads somewhere unexpected. |
| Get your bearings | Ask “Where do you think someone needs a hand?” Note the first clue each person actually uses, whether it’s the guide, cottage note, mission card, a landmark, or the other player. A detour to the chest or fishing dock is worth recording. What drew them there, and how did they find their way back? |
| Load and drive | Let them decide who does what. Record one moment where a partner’s action makes the job easier and any stretch where someone has nothing useful to do. If a crate falls, watch how they recover it and whether they still know where to go. |
| Make the first delivery | Watch both screens as one player hands over a crate. Before pointing at the HUD, ask each player separately, “What changed? How much do we have? Who can spend it?” Record their answers and the balances they can actually find. |

**Quick note during play** — `Time | Player and role | Exact words or action | What each screen showed | Hint, if used`

<details>
<summary>Route and controls if the crew gets stuck</summary>

1. The host can enter a game name or choose **Skip for now**. Open **O → Invite a crewmate → Copy LAN link**. The other player opens that link, including its port, on their computer.
2. At the cottages, open **Crew guide** on the mission panel or press **E** at your own door during daylight to read the welcome note. Cross the main road to the Harbor Depot freight yard south of the cottages. The starter delivery is already active.
3. One player can stage a crate while the other positions the flatbed. Walk up to a crate and press **E** to pick it up. Carry it to the rear of the truck and press **E** at **Load crate**. The first player to board the stopped truck with **F** takes the wheel. The other can board as passenger.
4. Follow the road east to Seabrook and stop near the teal delivery circle. Press **F** to get out. At the truck, press **E** at **Unload crate**, carry it into the circle, then press **E** at **Deliver crate**. One crate is enough for this test.

</details>

## At the first payday

The expected result is **1 / 3 delivered** and **2 coins in one shared bank**. Both players should see the same balance, including the player who stayed in the cab. The Crew guide should show **Crate delivered · +2 coins** as its latest starter payout. Record the elapsed time and whether either player needed the guide to explain the reward. [Shared progression](../design/progression.md#what-belongs-to-whom)

Ask “What would you do next together?” Capture their actual answer, including anything that makes them want to stay or explore. If time permits, refresh one browser before moving a second crate. Check that it returns to the same crew, **1 / 3** and **2 coins**. Mark this check as skipped if you end at payday.

## Turn a moment into a milestone issue

Debrief together and pick the moment you would most want improved on the next run. Give priority to anything that blocks joining, completing a delivery, or receiving the correct pay. A hint that repeatedly rescues players and a role that leaves someone idle are also actionable.

Use one observation per issue. Copy this into a new issue or add it to an existing one covering the same behavior.

- **Title** — What happened, to whom, and where?
- **Evidence** — Build, save state, elapsed time, player roles, exact action or quote, and what each screen showed. Include the hint or workaround if one helped.
- **Expected / observed** — What did the player expect? What did the game actually do? Record a suspected cause separately.
- **Acceptance playtest** — Give another crew the same starting conditions and name the observable result on both screens.

For example, **if** the passenger asks “Did only you get paid?”, first record whether their balance is wrong or whether they missed the feedback. Those lead to different fixes. A useful retest is to let the passenger stay in the truck during the first hand-in and see whether they can identify the two shared coins without coaching.

Assign follow-ups to [Starter Island · At home before the ferry](https://github.com/brylie/mission-island/milestone/4). Link first-day orientation regressions to the completed [welcome and first shift issue #49](https://github.com/brylie/mission-island/issues/49), payout clarity or hauling roles to [#50](https://github.com/brylie/mission-island/issues/50), and first-payday timing or persistence evidence to [#52](https://github.com/brylie/mission-island/issues/52). Record the observation, decision, issue link and eventual retest in the [playtest findings log](findings.md).
