# Design decisions and open questions

Record a choice here when another designer could reasonably make the opposite choice while working on a different system. Include the reason, the consequence a player can notice, and the evidence that would make the team revisit it. GitHub issues hold the implementation work.

## Established direction

| Choice | Reason and consequence | Where to follow it |
| --- | --- | --- |
| Two players can join from separate browsers on the LAN. | A parent and child can build and play together with one host laptop. A client refresh should be enough to try an edit. | [Running the game](../../README.md#play-on-your-local-network) |
| Vehicle exteriors support a third-person driving view. | The crew can see a partner approaching, cargo shifting, and the space around the truck. Check the same proportions on foot and from above. | [Game design](../game-design.md#feel-and-art-direction) |
| One crew bank follows the players across islands. Planned careers and trust are shared. | A market sale or a completed job advances the same goal even when the players work apart. Either player can spend crew coins. | [Progression and ownership](progression.md#what-belongs-to-whom) |
| Every job should be doable solo and easier together through distinct roles. | A solo hauler can stage, load and drive. In a pair, one stages freight while the other positions the truck. Playtest both ways and look for useful work for each role. | [Crew orders playtest](../mechanics/crew-orders.md#playtest) |
| Restore a dedicated ferry terminal at the end of Harbor Depot road. | The repair gives several livelihoods a shared purpose. The small fishing dock keeps its use for the skiff and fishing. | [Community project](https://github.com/brylie/mission-island/issues/4) |
| A resident lends a shared toolbox for a favor rather than adding a tool to a personal inventory. | The loaner is a world item either player can carry, set down or hand over at the job. If a carrier leaves, the partner asks the resident to put it back on the mending bench and carries on. Revisit if players expect a borrowed tool in their own inventory, or if a later favor needs a tool both players use at once. | [Neighbor repairs](../mechanics/neighbor-repairs.md) |
| Generate variation around recognizable places. | A resident can give reliable directions even as weather, animal behavior, or vegetation changes. Use reproducible conditions to review a change to traversal or shared progress. | [Generativity](../game-design.md#generativity) |

## Questions with a way to answer them

| Open question | Evidence to collect |
| --- | --- |
| How much work should ferry repair take? | Run both earning routes, record active minutes, island days and purchases, and ask when the next contribution became clear. [Balance playtest](https://github.com/brylie/mission-island/issues/52) |
| Should the crossing stream the next island or load it separately? | Carry a tagged crate across, reconnect a passenger, and return with the right cargo, order and crew bank balance. Use travel time and host performance alongside that result. [Ferry check-in](https://github.com/brylie/mission-island/issues/20) |
| Which changes should seasons bring to daily life? | First see whether time and weather give players a reason to revisit a known habitat. Keep seasonal jobs and species changes as ideas until there is a playable example to compare. [Seasons](https://github.com/brylie/mission-island/issues/32) |

For a new idea, capture the **moment**, the **player choice**, and the **smallest test**. For example, a fisher mentioning shelter after rain could prompt the crew to take a woodland detour. Try one line of dialogue and one observable hare behavior, then ask whether the players found the clearing and could explain what they saw. Link a chosen experiment from the [roadmap](../roadmap.md) or its milestone. When a playtest settles a question, update the affected spec and record the reasoning here.
