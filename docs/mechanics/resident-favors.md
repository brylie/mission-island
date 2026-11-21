# Residents and favors

Four residents live on Starter Island. Each one has a home, a walk to work, working hours, a conversation with varied small talk, and at least one favor. Both players see the same routines on the shared island clock. Trust is shared by the crew and kept separately for each resident.

| Resident | Home | Work | Hours | Favor | Pays |
| --- | --- | --- | --- | --- | --- |
| **Mara**, fisher | Porch of the teal-roofed house by the depot trail | Small fishing dock | 06:00–18:00 | **Carrots for Mara’s supper:** give 2 carrots | +5 coins, Mara trust +1 |
| **Wren**, neighbor | Lilac-roofed cottage east of the Blue cottage | Mending bench by the ferry approach | 07:00–17:00 | **Wren’s gate:** mend the hinge ([Neighbor repairs](neighbor-repairs.md)). **Wren’s swollen gate:** plane the edge and report back ([below](#reporting-back-and-broken-promises)). Supply [Ferry Approach Edging](repair-materials.md) once the crew is checked out on materials. **Fish for Wren’s pie:** 2 fish, after the swollen gate. **Carrots for Wren’s soup:** 2 carrots | +5 coins and Wren trust +1 each |
| **Ines**, shopkeeper | Coral house across the Seabrook square | West end of the Seabrook Market stall | 07:30–18:00 | **Fresh fish for the market display:** give 2 fish | +5 coins, Ines trust +1 |
| **Bram**, harbor steward | Above the Harbor Depot office | Tally spot beside the job board | 06:30–16:30 | **Stage a load for Bram:** set one crate down in the yellow bay beside the depot, off Harbor Depot road. Offered after the starter shift | +5 coins, Bram trust +1 |

Each resident sets out at the start of their hours and walks home at the end. The walk takes a few island minutes. Overnight they wait at their door. Indoor evenings and lit windows are planned in [#128](https://github.com/brylie/mission-island/issues/128). A resident's schedule never closes a service. The market, the clothing counter and the job board work whether or not their resident is there.

## Talking and agreeing

Aim at a resident and press **E** to talk. Either player can talk to anyone at any time, and talking never earns trust. While a resident has a favor to ask, the conversation includes the request and an **Agree to help** button. Agreeing makes the favor crew-wide: both players see a notice, and the favor appears in the crew guide and on the mission card when no crew order is on it. Walking away without agreeing carries no penalty, and the resident asks again next time. Wren's gate starts when either player talks to Wren, as before.

A resident's prompt never takes **E** away from a service. Near the job board or the market stall, a bare **E** uses the service, and aiming at the resident talks to them.

## Keeping a favor

- **Goods.** Once the crew has agreed, any crewmate carrying enough can aim at the resident and press **Give 2 carrots to Mara** or **Give 2 fish to Ines**. The giver hands over exactly that many.
- **Cargo.** While Bram's favor is under way and no delivery order is open, crates in the freight yard can be picked up. If orders have used every crate, one comes back to the yard. Setting a crate down inside the yellow bay shows **Stage crate for Bram**. The crate leaves the yard like a delivered one. During a delivery order the bay takes nothing, so order crates are never lost to it.

Keeping a favor pays the crew bank once and raises that resident's trust by one. Both players see the same receipt, such as `+5 coins · Carrots for Mara’s supper · Crew bank · Mara trust +1`. A second hand-in, a repeated greeting or two presses on the same tick change nothing. The resident then greets the crew differently. Mara passes on a tide-pool clue for the planned [field outing](https://github.com/brylie/mission-island/issues/51), and Bram names what the [ferry terminal](https://github.com/brylie/mission-island/issues/4) needs.

## Trust

| Trust | Tier | What it means |
| --- | --- | --- |
| 0 | Stranger | The resident has not yet relied on the crew. |
| 1–2 | Familiar | The crew has kept at least one favor. Greetings recognize the crew. |
| 3 or more | Trusted | The resident relies on the crew. Wren lends the toolbox from the bench without being asked. |

Each favor counts once. Alongside the tier, each resident has a **standing**: *steady*, *wronged* after a broken promise, or *wary* once the crew has put it right.

## Reporting back and broken promises

Some favors are finished by reporting back. Wren's swollen gate is the first. After agreeing, the crew swings the gate to check it. A swing that catches is shown to both players (`The gate catches on its swollen edge`), and the crew guide records the finding. Planing the edge needs the toolbox at the gate, and then another swing. The conversation with Wren shows what the last swing found, next to two buttons: **Tell Wren it swings clear** and **Tell Wren it still catches**.

- **Telling Wren it still catches** costs nothing. Wren waits, and both players see that the crew was honest.
- **Telling Wren it swings clear after a clean swing** keeps the favor.
- **Telling Wren it swings clear after it caught** breaks the promise. This is the only way to lose trust. Wren's trust drops by two (never below zero), and both players see `Your crewmate told Wren it was fixed, but it wasn’t · Wren trust −2`. Wren goes round the back again, and the next greeting says why, to either player, after a late join or a host restart. The finding is cleared, so the crew has to swing the gate again before saying anything more.

**Making amends.** Either crewmate can put it right by planing the gate, swinging it clear and telling Wren. The work pays, but earns no trust. Wren thanks the crew and says they will check the next job in person.

**Rebuilding.** Any two more kept favors with Wren, such as the pie and the soup, or the ferry path edging, restore Wren's reliance on the crew. The second adds a point of trust, the receipt says `Wren relies on the crew again`, Wren says they have stopped checking the crew's work, and the toolbox on the bench is the crew's to borrow. A failed swing, a disconnect mid-job or a declined favor never costs trust. See [Shared crew Trust](../design/residents-and-destinations.md#shared-crew-trust).

## Small talk

Every conversation adds one remark chosen for the moment, between the greeting and the advice. A remark can depend on the hour, the rain, where the resident is (home, work or walking), the crew's trust tier and standing, or anything both players can see in the shared world. For example, a resident might mention smoke over the lookout, a glider seen over Windstone Ridge, ripe carrots at Island Farm, or how far the crew is from the second island. Residents also pass on gossip: once Mara has had her carrots, Ines might mention it, and after a broken promise to Wren the other residents notice Wren is upset.

Remarks fill small tokens, such as a time-of-day hello, the weather, and the name of the crewmate talking, from pools chosen for the moment. So the same remark comes out in several ways. Each crewmate's client picks the remark from a seed and never repeats the previous one for that resident. The island's shared remarks are in [`island-remarks.ts`](../../src/worlds/starter/island-remarks.ts), and each resident's own lines are in [`residents/remarks.ts`](../../src/worlds/starter/residents/remarks.ts). To add a line, give it the conditions it suits. A line with no conditions fits any moment.

## Saved state

The island save keeps one record per resident: trust, the favors kept, the favor under way, the crew's last finding on checked work, any broken promise with its amends and rebuilding count, and how many breaches have been rebuilt. It also keeps the last favor receipt and whether Wren's gate is swollen or planed. Island saves are version 5. A version 4 save starts every record with no breach, and a version 3 save carries Wren's trust and the gate's progress into Wren's record. A resident added after a save was made starts as a stranger, with no migration.

## Adding a resident

See [Residents](../architecture.md#residents) in the architecture guide. A new resident needs a definition file under `src/worlds/starter/residents/` and an entry at the end of the [registry](../../src/worlds/starter/residents.ts). Check the route with the walkability test in [the resident tests](../../test/game-residents.test.mjs), and walk it in the Workbench's **Resident routines** study.

## Playtest

Start `MISSION_ISLAND_CHECKPOINT=village-favors npm run playtest`. Both crewmates stand by Bram at 09:30, each carrying two fish and two carrots.

- Without reading the guide, can each player find Mara and Ines from Bram's directions and the map labels alone?
- One player agrees to Ines's request, then the other hands over the fish. Do both players understand what happened from the notice and Ines's next greeting?
- Stage a crate for Bram while the partner drives the flatbed past the bay. Does the truck lane stay clear?
- Restart the host with a favor under way, then join late as the second player. Is the favor in the crew guide?
- Sleep through a night and find each resident again by the clock.
- Talk to the same resident several times, in rain and sun and at different hours. Do the remarks feel like this person, and does any line jar with the moment?

For the breach, start `MISSION_ISLAND_CHECKPOINT=wren-swell npm run playtest`. One player swings the gate and sees it catch. The other walks to Wren and must choose what to say. Afterwards, can the player who wasn't there explain what happened from Wren's next greeting alone?
