# Residents and favors

Four residents live on Starter Island. Each one has a home, a walk to work, working hours, a short conversation and at least one favor. Both players see the same routines on the shared island clock. Trust is shared by the crew and kept separately for each resident.

| Resident | Home | Work | Hours | Favor | Pays |
| --- | --- | --- | --- | --- | --- |
| **Mara**, fisher | Porch of the teal-roofed house by the depot trail | Small fishing dock | 06:00–18:00 | **Carrots for Mara’s supper:** give 2 carrots | +5 coins, Mara trust +1 |
| **Wren**, neighbor | Lilac-roofed cottage east of the Blue cottage | Mending bench by the ferry approach | 07:00–17:00 | Mend [Wren’s gate](neighbor-repairs.md), then supply [Ferry Approach Edging](repair-materials.md) | +5 coins and Wren trust +1 per favor |
| **Ines**, shopkeeper | Coral house across the Seabrook square | West end of the Seabrook Market stall | 07:30–18:00 | **Fresh fish for the market display:** give 2 fish | +5 coins, Ines trust +1 |
| **Bram**, harbor steward | Above the Harbor Depot office | Tally spot beside the job board | 06:30–16:30 | **Stage a load for Bram:** set one crate down in the yellow bay beside the depot, off Harbor Depot road. Offered after the starter shift | +5 coins, Bram trust +1 |

Each resident sets out at the start of their hours and walks home at the end. The walk takes a few island minutes. Overnight they wait at their door. Indoor evenings and lit windows are planned in [#128](https://github.com/brylie/mission-island/issues/128). A resident's schedule never closes a service. The market, the clothing counter and the job board work whether or not their resident is there.

## Talking and agreeing

Aim at a resident and press **E** to talk. Either player can talk to anyone at any time, and talking never earns trust. While a resident has a favor to ask, the conversation includes the request and an **Agree to help** button. Agreeing makes the favor crew-wide: both players see a notice, and the favor appears in the crew guide and on the mission card when no crew order is on it. Walking away without agreeing carries no penalty, and the resident asks again next time. Wren's gate starts when either player talks to Wren, as before.

A resident's prompt never takes **E** away from a service. Near the job board or the market stall, a bare **E** uses the service, and aiming at the resident talks to them.

## Keeping a favor

- **Goods.** Once the crew has agreed, any crewmate carrying enough can aim at the resident and press **Give 2 carrots to Mara** or **Give 2 fish to Ines**. The giver hands over exactly that many.
- **Cargo.** While Bram's favor is under way and no delivery order is open, crates in the freight yard can be picked up. If orders have used every crate, one comes back to the yard. Setting a crate down inside the yellow bay shows **Stage crate for Bram**. The crate leaves the yard like a delivered one. During a delivery order the bay takes nothing, so order crates are never lost to it.

Keeping a favor pays the crew bank once and raises that resident's trust by one. Both players see the same receipt, such as `+5 coins · Carrots for Mara’s supper · Crew bank · Mara trust +1`. A second hand-in, a repeated greeting or two presses on the same tick change nothing. The resident then greets the crew differently. Mara thanks the crew for supper, and Bram names what the [ferry terminal](https://github.com/brylie/mission-island/issues/4) needs. Mara offers the [field outing](../player-guide.md#maras-field-outing) from the first conversation.

## Trust

| Trust | Tier | What it means |
| --- | --- | --- |
| 0 | Stranger | The resident has not yet relied on the crew. |
| 1–2 | Familiar | The crew has kept at least one favor. Greetings recognize the crew. |
| 3 or more | Trusted | Reserved for later favors that lend a tool or ask more of the crew. |

Each favor counts once. Breaking a promise and making amends are planned with a clearly signposted breach moment. See [Shared crew Trust](../design/residents-and-destinations.md#shared-crew-trust).

## Saved state

The island save keeps one record per resident: trust, the favors kept, and the favor under way. It also keeps the last favor receipt. Island saves are version 4. A version 3 save carries Wren's trust and the gate's progress into Wren's record. A resident added after a save was made starts as a stranger, with no migration.

## Adding a resident

See [Residents](../architecture.md#residents) in the architecture guide. A new resident needs a definition file under `src/worlds/starter/residents/` and an entry at the end of the [registry](../../src/worlds/starter/residents.ts). Check the route with the walkability test in [the resident tests](../../test/game-residents.test.mjs), and walk it in the Workbench's **Resident routines** study.

## Playtest

Start `MISSION_ISLAND_CHECKPOINT=village-favors npm run playtest`. Both crewmates stand by Bram at 09:30, each carrying two fish and two carrots.

- Without reading the guide, can each player find Mara and Ines from Bram's directions and the map labels alone?
- One player agrees to Ines's request, then the other hands over the fish. Do both players understand what happened from the notice and Ines's next greeting?
- Stage a crate for Bram while the partner drives the flatbed past the bay. Does the truck lane stay clear?
- Restart the host with a favor under way, then join late as the second player. Is the favor in the crew guide?
- Sleep through a night and find each resident again by the clock.
