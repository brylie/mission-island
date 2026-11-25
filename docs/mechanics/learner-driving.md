# Learner driving: practice tours

**Playable. Last tended 2026-11-25.** Two learner vehicles teach the first driving of two Saltwind careers. The red Fire and Rescue pickup waits beside Fire Supplies, and the green Island Farm tractor waits north of the farm plots. Each one offers a **practice tour**: a fixed list of stops, visited once each in order. At each stop the driver earns career XP and the crew reads what the stop teaches. After the last stop the tour ends with a summary. It never starts over by itself.

## Driving a stop

Walk up to a stopped vehicle and press **F** to take the wheel. A crewmate can ride in the pickup's passenger seat; the tractor seats only its operator. Whoever boards before the tour's first stop sees what the tour is, for example **Rescue tour** `12 stops, village to Highwood and back`.

While you ride, the prompt, the mission card and the map name the next stop. The card reads `Stop 3 of 12: Harbor Depot. Stop inside the ring of cones; the driver earns 10 Emergency driving XP.` A gold ring with orange cones marks the stop on the ground, and the map shows it as a hollow gold ring. The card names only the stop, because it is read while driving.

Pull up within 4 m of the ring's centre and brake to a full stop with **Space**. The prompt says when to pull forward into the ring or finish stopping. The driver earns 10 career XP and the next stop comes up for the whole crew, so partners can take turns at the wheel. Only the driver earns driving XP. Once the vehicle has stopped, the stop's lesson shows as a notice for 9 seconds: the driver reads `Harbor Depot: The depot’s fire station stands…`, and everyone else reads `Ana stopped at Harbor Depot: … · +10 Emergency driving`.

## The rescue tour

The pickup's tour is a circuit of about 1.7 km. It leaves from the pickup's parking spot, takes in the village, climbs the Highwood fire road, goes round the loop the Pine Draw road, the Cairn ridge road and the summit spur make, and comes home down the fire road to where it started.

Every stop is read from the island's own data: a fire station's position on Harbor Depot road, the farm's delivery drop, a dot or a measured point on a road laid in the [road designer](../workbench.md#design-roads), the culverts the grading places, or the pickup's own parking spot. A road moved in the designer moves its stops with it, so a road change can't strand a stop in the trees. If a road or place a stop reads from is removed, that stop is left out rather than placed somewhere guessed, and the tour test fails until someone looks at the tour again. The tour lives in [`src/rescue-tour.ts`](../../src/rescue-tour.ts).

| # | Stop | Where it comes from | What it teaches |
| --- | --- | --- | --- |
| 1 | Fire Watch | The point on Harbor Depot road nearest the Fire Watch fire station, 6 m from the parking spot | The [Fire Watch tower](fire-watch.md#the-fire-watch-tower), its fire finder, and the station at the foot of its stairs |
| 2 | Island Farm | The drop for the farm supplies delivery, reached by the beach trail | Dry fields and the Long Acre hedgerow are where [grass fires](fire-watch.md#wildfires) start; the farm has its own station |
| 3 | Harbor Depot | The point on Harbor Depot road nearest the depot's fire station | Any red station refills an extinguisher with **E** |
| 4 | Fire road trailhead | The first dot of the Highwood fire road, where the village paving ends | The [fire road](../backcountry.md#fire-road) is packed earth, one lane, 4 m wide |
| 5 | Fire road culvert | The fire road at the first culvert along it that has an outlet (`roadCulverts`), about 170 m up | How a culvert carries water under a road: a headwall at the inlet, packed stone below the outlet ([forest roads](../field-guide/practices/forest-roads.md#water)) |
| 6 | Cairn turnoff | The first dot of the Cairn Summit spur, on the fire road | Where the spur leaves; the fire road climbs at up to 12%, and the tour comes back down the spur later |
| 7 | Alder Creek | The point on the fire road nearest the Alder Creek ford viewpoint (`highwood-creek-ford`), just past where the road dips across the creek's bed | The crossing is plain ground until the stone ford is built; don't drive through water running over a road ([fords](../field-guide/practices/forest-roads.md#fords)) |
| 8 | Pine Draw hairpin | The Pine Draw road's tightest bend, measured from its samples (about 11 m radius) | A switchback: why a road turns back on itself to climb ([grade](../field-guide/practices/forest-roads.md#grade)) |
| 9 | Cairn ridge | The middle of the Cairn ridge road | Climbing at up to 15% onto the ridge; fire runs faster uphill ([wildfire](../field-guide/processes/wildfire.md)) |
| 10 | Ridge junction | The last dot of the Cairn ridge road, where it joins the summit spur | A loop lets a crew drive round instead of turning back, and gives a second way out |
| 11 | Summit pad | The last dot of the Cairn Summit spur | A turning area at the end of a dead-end road; the summit is on foot from here |
| 12 | Fire Supplies | The pickup's parking spot | Home: the Fire Supplies stock refills an extinguisher like any station |

### The route

1. **Village.** From the parking spot the pickup rolls 6 m east to the Fire Watch stop, so the first lesson is just stopping in the ring. It runs on east to Seabrook and down the beach trail to the farm, back up the trail and west along Harbor Depot road to the depot, then back east to the trailhead. The farm and the depot are both at the ends of spurs off the harbor road, so those two short stretches are driven both ways.
2. **Up the fire road.** The fire road climbs past the culvert to the Cairn turnoff. The tour stays on the fire road, past Alder Creek, to its end, where the Pine Draw road begins.
3. **The loop.** The Pine Draw road climbs to its hairpin. The Cairn ridge road leaves the Pine Draw road just before the hairpin, so the pickup turns there and drives about 35 m back to take it. The ridge road climbs to the ridge junction on the summit spur. The spur's top 134 m to the summit pad is a dead end, so the pickup turns on the pad and comes back down.
4. **Home.** Down the whole spur to the Cairn turnoff, which closes the loop, then down the fire road to the trailhead and Fire Supplies.

The fire road is the only road between the village and Highwood, so it is driven up and down. Its stretch from the trailhead to the Cairn turnoff carries three stops on the way up and none on the way down.

### Pacing

Twelve stops at 10 XP pay 120 Emergency driving XP, so one solo tour reaches the 100 XP Saltwind qualification at stop 10, the ridge junction. Two crewmates sharing the wheel each earn what they drove, so a shared tour is a step toward both qualifications, and a second tour finishes them.

### The tractor's tour

The tractor's tour works the same way, with three stops at walking pace: Seabrook Market, the meadow slope and the Island Farm lane. It is not a circuit. Its stops are listed in the [Starter Island layout](../../src/worlds/starter/layout/places.ts) and teach no lesson of their own yet, so their notice gives the driver's XP instead. It pays 30 XP a tour.

## The end of a tour

The last stop's notice is the summary, shown to the whole crew for 9 seconds. Each viewer reads their own share first, then their crewmates', then who qualified on this tour:

- solo: **Rescue tour complete** `12 stops · you earned 120 Emergency driving XP · You qualified`
- shared: **Rescue tour complete** `12 stops · you earned 60, Ana earned 60 Emergency driving XP`

The ring and the map ring go away. A finished tour pays nothing more: stopping at any of its stops, or waiting at the last one, earns no XP.

## Starting a tour again

The tour repeats only when the crew chooses. While it is finished:

- aboard, the card reads `Rescue tour complete: 12 stops. At the pickup’s driver’s door, press E to start the tour again, or aim at its cab.`, and the seated prompt reads `Exit pickup · tour complete · then E at the driver’s door to go again`. At the wheel, **E** does nothing;
- on foot within 4 m of the stopped vehicle, the same card shows, so the instruction stays in view while you follow it. It gives way to an active delivery, fire, market order or wildfire card, so a crew collecting extinguishers at Fire Supplies still sees its mission;
- at the driver's door, where the driver steps out, **E · Start the pickup practice tour again** is the first thing **E** does, with no aim needed. This works with the keyboard alone. Because the driver steps out there, **E** meant for the bed's gear restarts a finished tour instead; that does no harm, and gear is taken by aiming at it;
- anywhere else beside the vehicle the restart comes last of everything **E** can do, so **E** at the bed still takes gear and **E** at a fire station still refills. Aim the reticle at the cab to pick it there.

Any crewmate can start it, not only the last driver. Everyone sees `Ana started the pickup practice tour again`, and stop 1 comes up for the crew. A tour that has started can't be started again part way: the option shows only once it has finished.

## Ownership and restarts

The host owns each vehicle's tour. The snapshot's `practice` holds the index of the next stop, shared by the crew, and `practiceTours` holds the tour's key and, for the tour in progress, what each driver has earned on it and who qualified. An index equal to the number of stops means the tour is finished. The save keeps both, and the game saves after each stop and after a restart. A tour finished before a host restart is still finished after it, and a part-run tour resumes at the same stop with its drivers' totals.

The key is the tour's stop names, in order. A save whose key differs, or a save from before tours had keys, starts that vehicle's tour over at stop 1 with nothing earned, so an index from an old list never lands on a different stop of the new one. A saved index beyond the tour loads as finished. Career XP belongs to each crewmate and is saved with their profile; a reset tour never takes it away. The tractor's tour has a key too, so a tractor saved before keys existed also starts over, losing at most two stops of progress.

## Playtests

**Ordinary.** Run the `learner-pickup` checkpoint with two crewmates. The first takes the wheel and reads the tour's opening notice; the second rides. Drive the circuit, swapping drivers at the trailhead. Check that each stop pays its driver once, that its lesson shows once the pickup stops, and that the summary at Fire Supplies gives each of you your own XP. Then the crewmate who was not driving walks to the driver's door and presses **E** to start the tour again.

**Revealing edge case.** Finish the tour, then restart the host before anyone starts it again. Board the pickup: the card still reads `Rescue tour complete`, there is no ring, and stopping at the Fire Watch pays nothing. Step out at the bed and press **E**: you take gear and the tour stays finished. Only **E** at the driver's door, or aimed at the cab, brings stop 1 back.

## Where the island differs

The lessons describe the island's own places. The ones that touch real practice link to their sourced home: forest road widths, grades, switchbacks and culverts on the [forest roads](../field-guide/practices/forest-roads.md) page, flood water at crossings in its [fords](../field-guide/practices/forest-roads.md#fords) section, whose safety box is still pending review, and uphill fire spread on the [wildfire](../field-guide/processes/wildfire.md) page. Whether real dead-end fire roads must end in a turning area, and whether a loop road counts as a second way out for a fire crew, is still unsourced and is not claimed as real practice on screen.

The tour is checked in [`test/game-rescue-tour.test.mjs`](../../test/game-rescue-tour.test.mjs). Its legs set the pickup down at each stop through the save rather than steering between them, then hold the brake for two seconds to check it rests in the ring; the fire road climbs themselves are driven in [`test/game-fire-road.test.mjs`](../../test/game-fire-road.test.mjs).
