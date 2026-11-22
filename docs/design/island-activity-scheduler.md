# Island activity scheduler

**Proposed.** The implementation and joint playtest are tracked in [#148](https://github.com/brylie/mission-island/issues/148). Give the crew a day with room to choose. They might deliver a load, help a neighbor and go fishing on the way home. Another day they may follow a wildlife clue or spend the whole afternoon on the water. The host can coordinate when jobs, favors, gatherings and incidents become available so those possibilities leave room for each other.

## What takes the crew’s attention

| Activity | Player experience | Starting policy to test |
| --- | --- | --- |
| Board order | The board presents a short list. Either player may choose one job for the crew. Both can see the next action. | Keep the existing single active order. Rotate unclaimed offers on the shared day. An accepted order and its progress persist through sleep, disconnects and restarts. |
| Resident favor | A resident can ask for help in conversation. The crew can agree, defer or return later. | Try one active optional favor alongside the order. Leave other requests discoverable in conversation so the crew can come back. Older saves keep their existing commitments and hand-ins. Offer the next acceptance when a slot opens. |
| Incident | A smoke plume or report makes one nearby problem understandable. Either player can choose whether to respond. | Try at most one active urgent incident. Delay the next offer while the crew is learning a new mechanic or already responding. An unclaimed incident can be handled by residents, with any visible outcome signposted and no automatic Trust loss. |
| Gathering or seasonal outing | Seabrook Market posts its date so the crew can plan a visit. A missed gathering can come around again. | Reserve its time window ahead of time and give the crew a quiet arrival. Keep regular services and ways to earn available. |
| Free play and long projects | Players can fish, farm, explore, or contribute toward ferry restoration at their own pace. | Keep self-directed actions freely available. Track long projects in the crew guide and surface reminders when the crew checks in or a stage actually changes. |

Keep only one primary objective in the prominent HUD at a time. Put other goals the crew has accepted in the crew guide. Treat a new event as one short notice with a clear location and choice. Keep a visible receipt or status when someone responds, resolves it, or it ends. Both players should be able to tell what their partner accepted without a stream of prompts.

## Timing, rarity and variety

Separate eligibility from chance. On an eligible island day, decide whether to offer anything, then choose among the candidates. A quiet day is a valid result.

1. **Apply hard limits.** Start by leaving at least seven island days between fire starts and allow only one urgent incident at a time. Include authored incidents in the fire limit, such as the starter Lookout fire, and schedule a required follow-up in a later eligible window. Count by days since the last start so the end of one calendar week cannot put fires on consecutive mornings.
2. **Weight eligible candidates.** Tune the chance and mix of offers by conditions such as local weather, the resident’s hours, the crew’s unlocked equipment and whether the site is reachable. An occurrence can be rare on average and still happen soon after its cooldown. Use the hard limit when close repeats would overwhelm players. Give the scheduler an explicit chance to leave the day quiet.
3. **Choose a plausible site and severity.** Avoid the most recent site where another suitable site is available. Let conditions and available response equipment constrain what can happen there. A small incident near a service yard gives a starter crew a chance to learn. A crew with more capabilities can later see different jobs and severities. Keep a candidate out of the draw if it would block a required route or depend on equipment the crew cannot access.

The seven-day fire spacing and task limits are provisional until the joint playtest. Compare two setups with different limits. Record how many island days pass in a real session, how often either player feels obliged to respond, and whether they feel free to leave a task for tomorrow. Predictable rest is as important as a varied pool of tasks.

## Incident pool for later playtests

| Incident | Plausible trigger and player action | How a pair can help |
| --- | --- | --- |
| Road debris | Strong wind or a shower leaves a branch or a small deposit of loose gravel on an exposed path. Mark it, take the bypass, or move it to the verge. Keep a safe route to essential services. | One locates the obstruction and marks the approach while the other brings a handcart or helps move it. [Road service #23](https://github.com/brylie/mission-island/issues/23) |
| Small fire | A resident notices smoke from a brazier by a service yard. Start with the known call in #97. Later vary the site and severity according to weather, nearby activity, and the crew’s unlocked equipment. | One locates the source and calls out a clear approach while the other fetches and uses the extinguisher. [Fire and rescue career #12](https://github.com/brylie/mission-island/issues/12) |
| Animal rescue | A resident reports a domestic animal stranded after a disturbance, such as a hen separated from its flock by a fallen branch. Open a clear route or bring a carrier, then return the animal. | One watches where it goes or clears an exit while the other brings the carrier. Build the incident from the animal’s movement and reactions, and show it settled afterward. |

Give each family an ordinary solo route and a clear outcome players can see. Introduce one family at a time. When broadening the pool, try a second plausible site and check what it changes about the response. Share recent site history across variants so the same location gets a rest. If the crew passes, let the island settle the incident in a way the crew can recognize on their next visit.

## Host-owned decisions

Give activity definitions stable IDs, a kind, time and weather windows, prerequisites, a cooldown group and weight. Sites and severity can come from the activity’s existing authoring data. Let the host scheduler choose opportunities and route them to the existing job, favor or incident system. Each mechanic keeps its own progress and payout rules.

Use the shared island day and evaluate at named windows such as dawn and late morning. Draw from a stable save seed and the window’s day and identity. Persist the outcome once evaluated, including a quiet result, along with recent starts and any outstanding offer or incident. Refreshing, sleeping forward or restarting should neither reroll an offer nor replay a backlog of notices from skipped windows. The two browsers read the same offers and choice outcomes. Closing or deferring an optional opportunity leaves unrelated commitments and shared bank progress intact.

Let playtest checkpoints stage a busy crew day, a recent fire, or a market event and inspect which opportunities were available or held back. Keep any forcing controls in the disposable harness so normal saves use ordinary selection.

## First slice

Start with rotating the [Harbor Job Board #5](https://github.com/brylie/mission-island/issues/5) and placing the [second neighborhood response #97](https://github.com/brylie/mission-island/issues/97) in a later eligible window after the lookout. Use that small pair to test whether the systems respect the same day and commitments before adding a pool of random incidents or [market gatherings #9](https://github.com/brylie/mission-island/issues/9).

Try three scenarios through the regular host and in two browsers. Record the human results in [#52](https://github.com/brylie/mission-island/issues/52).

- **A quiet day.** With an order accepted, one player leaves to fish while the other finishes the delivery. Both know the order is still available and neither feels they missed an urgent task.
- **A day with competing plans.** A favor is underway and a response opportunity is eligible. One player learns about the incident. Both can explain whether the crew took it and what is still owed. Another resident can mention a favor and offer to talk again after the active one is finished. Reconnect or restart and check that notices and offers stay coherent.
- **A week with a fire.** Start with a known fire date and advance several island days, including by sleeping and restarting. Confirm the next fire cannot start inside the rolling limit. Compare several seeds beyond that limit for quiet days and variation in time or site. Check the first eligible day from both browsers.
