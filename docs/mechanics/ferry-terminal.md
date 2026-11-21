# Community project: the ferry terminal

**Playable.** Harbor Depot road leaves Seabrook, curves south-west past the fork to the depot lane, and straightens at about z −19.5. From there it runs on one alignment for 11.5 m to the striped barrier at the ferry terminal, (−30, −31). The ferry freight yard opens off the east side of that straight. It is a gravel pad from x −26.3 to −16.5 and z −29.5 to −19.5, with room for the flatbed to pull in, park parallel to the road and leave the ramp lane clear. Beyond the barrier, a tall gantry marks the landing and the broken deck shows a gap over the water. The depot lane forks west to Harbor Depot, the job board and the cottages. The small fishing dock at (−44, −29) still serves the skiff.

The crew restores the terminal in three stages. Each stage takes coins from the crew bank and timber hauled from Seabrook. The work changes the terminal in ways both players can see between sessions. Ferry crossings belong to [#20](https://github.com/brylie/mission-island/issues/20).

## Opening the project

The four completed board orders that already mark the crew ready ([crew orders](crew-orders.md)) also open the repair. Before then, the **tally board** at the yard's south-west corner, (−24.8, −30.1), reads *Closed for repairs* and shows the order count, such as 3/4. From the fourth order on, the board explains what the current stage needs. The mission card shows a **Community project** card whenever no order or favor is in progress.

## Stages

| Stage | Coins | Timber crates | What changes at the terminal |
| --- | ---: | ---: | --- |
| Brace the landing | 12 | 2 | The broken planks and the old slab come out. Steel piles get caps and new timber stringers, and scaffolding goes up. |
| Lay the new deck | 12 | 2 | Fresh decking and side rails run out to the berth. An amber *Opening soon* board hangs on the gantry post. |
| Open the ramp | 12 | 2 | The scaffolding comes down. The barrier arm is raised upright, the gantry lamps light, and a green service board replaces the amber one. |

The amounts are trial values for the [balance playtest #52](https://github.com/brylie/mission-island/issues/52), not settled prices. A stage finishes the moment its last coin or crate arrives. Both screens then announce it, and the next stage opens.

## At the tally board

Three things on the board can be aimed at with **E**:

- **Read the ferry tally board.** Opens the full tally: the stage in hand, coins and timber given so far, who gave each part, the next step, and every finished stage with its contributors. This is what a press with no choice does, so **E** alone never spends the crew bank.
- **Donate coins from the crew bank.** Gives up to five coins toward the stage, capped by what the stage still needs and what the bank holds. The donor is recorded.
- **Order timber crates from Seabrook.** Available when the stage still needs timber, no delivery order is running and the depot crates are idle. The order places as many crates as the stage needs on the **Seabrook timber stack**, on the verge south of the main road at about (20.8, 6.6).

The board shows a coin bar and a timber bar. Each filled cell takes the colour of the crewmate who gave it, and three pips at the top show finished stages. The stacked timber on the yard pallet grows with each crate.

## Hauling timber

The timber rides in the depot crates. Load them onto the flatbed at the Seabrook stack, drive back along Harbor Depot road, pull into the yard and set each crate down within 4 m of the yard pallet at (−21.5, −24). The prompt reads **Stack timber for the ferry repair**. The crewmate who sets a crate down is credited with it and earns the usual hauling XP.

While timber is on the way, the job board refuses delivery orders, because those orders use the same crates. Market orders still work. Timber can always be stacked, so a haul never blocks the board for long.

## Co-op roles and recovery

A solo player can donate, order, load, drive and stack. In a pair, one player can drive while the other loads and stacks, or one can earn at the market while the other hauls. Either player can donate the shared coins.

- **Simultaneous presses.** Each donation or order is recomputed from the current state when it runs, so two presses together cannot overshoot a stage. Once a need is met, the option disappears.
- **Disconnects.** Nothing about the project is held by a player. A carried timber crate follows the usual carry rules: the carrier keeps it through the reconnect grace period, then it drops where they stood. The partner can pick it up and stack it. A crate lost in deep water or sent back by an unsafe respawn returns to the depot, and it can still be stacked at the yard.
- **Late joiners.** The tally board, the mission card and the terminal itself are all built from the shared state.

## The restored ramp

Until the last stage is finished, the barrier is a solid across the full lane. Once the ramp opens, the barrier gives way to a landing deck from z −36 to −46.8. The deck rises gently from 0.02 m to 0.14 m above the waterline, in steps shallow enough to walk. The flatbed drives straight on, and its shore check stops it dry at the end of the deck. The crew walks the deck without wading. The scenery, physics and walking surfaces all read the same barrier and deck shapes from `src/ferry-repair.ts`.

## Saved state

The host saves the stage, a ledger of coins and crates for each stage and each crew slot, the timber still on the way, and the island time when service was restored. Island saves are version 6; version 5 added the ferry repair. Version 4 and earlier saves start the repair untouched. The host rejects a save whose progress does not add up:

- a finished stage that did not exactly meet its needs,
- a current stage that has overshot,
- more timber on the way than the stage needs,
- a restored terminal without its restoration time.

A truck saved on the restored ramp parks on the deck after a restart.

## Playtest

Live checkpoints for `npm run playtest`:

| Scenario ID | Starting condition |
| --- | --- |
| `ferry-approach` | The project is open and the crew stands by the flatbed on the return road from Seabrook. Stage 0, barrier down. |
| `ferry-yard` | Stage 2. The flatbed is parked in the yard and two timber crates wait behind it. Stack them to finish the timber for the stage. |
| `ferry-restored` | The ramp is open. The flatbed waits on the straight, facing the terminal. |

The Workbench has two landscape views, **Ferry approach from Harbor Depot road** and **Ferry freight yard and tally board**.

**Find the ramp from the truck.** Give a first-time driver the flatbed at `ferry-approach`. Use the usual third-person driving camera, with the map closed and route markers hidden or ignored. Ask: “A ferry is bringing our next load. Where would you drive to meet it?” The passenger observes without giving directions.

1. Before restoration, the driver should identify the landing by the time they pass the yard entrance and reach the striped barrier. Record where they first recognised the ramp, the cue they used, any wrong turn into the yard or toward the fishing dock, and any hint they needed.
2. After restoration (`ferry-restored`), swap drivers and repeat the approach. The flatbed should continue straight onto the ramp. On the way back toward town, it should be able to pull into the side yard for unloading while the approach stays clear.

**Two routes to a stage.** Fund one stage by hauling depot orders, and another by fishing and farming. Record the minutes and island days each took, using the [economy sheet](../design/starter-economy.md).

**Edge cases.**

- Press **Donate** on both clients at the same moment with only a few coins left to give. Check that the stage takes exactly what it needed.
- Disconnect while carrying timber, finish the haul with the partner, and reconnect. Check that the haul was credited once.
- Restart the host between stages. Check that the tally, the terminal stage and each contributor's share all survive.
