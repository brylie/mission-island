# Neighbor repairs: Wren's gate

**Playable.** Wren lives in the lilac-roofed cottage east of the Blue cottage, at about (−35.8, −3.2). A picket fence taller than a jump closes off the front garden. The garden gate at (−35.8, −7.5) opens onto the main road and has a worn top hinge pin. The free end of the gate drops and drags a groove in the path, and the leaf sticks a short way open. Wren works at the **mending bench** on the grass beside the ferry approach, at about (−27.4, −26.6), from 07:00 to 17:00. Until the gate is fixed, Wren leaves by the back door and walks the long way round, between the Blue cottage and the fence.

## The job

1. **Talk to Wren** at the cottage or the bench. Wren asks for help and lends the red toolbox that sits on the mending bench.
2. **Inspect the sagging hinge** at the gate. The worn pin is visible, and the step feedback names the part and where to find it.
3. **Take a hinge pin** from the tray on the mending bench. Only one unfitted pin is out at a time.
4. **Fit the hinge pin.** The acting player must be at the gate. The pin must be with a connected crewmember at the gate. The toolbox must be there too, either held by a connected crewmember or set down within 2.5 m of the gate. The leaf straightens and a new brass pin shows in the hinge.
5. **Swing the gate to test it.** The leaf opens fully and the opening is wide enough to walk through. The crew bank gets **+5 coins** once, and Wren's trust goes up by one. Both screens show `+5 coins · Wren's gate mended · Crew bank · Wren trust +1`.

Before the repair, anyone can **Try the sagging gate**. The leaf opens about 17° and leaves less than a body's width, so walking into it shows that something is wrong without any message. After the repair, either player can open and close the gate. A close waits until nobody is standing in the opening.

The day after the repair, grass grows over the groove. Wren leaves by the front door, opens the gate and takes the shortcut to work, then closes it once the opening is clear. Wren's greeting recognizes the crew. Put the toolbox back on the bench with **Return the toolbox to Wren**. A toolbox put back on the bench after the repair stays there.

## Prompts and input

**E** acts on the step the prompt shows. The client sends that step with the request, and the host carries it out only if the same step is still available to that player. When two players press at once, the first press is carried out and the second does nothing. A request with no step never moves the job along. A gate step takes priority over setting down a held toolbox. Swinging the gate and a general chat with Wren both give way to setting down or picking up an item nearby, so the toolbox on Wren's bench can be picked up while Wren is working there. Away from the gate, **E** sets the toolbox down.

## Co-op roles and recovery

A solo player can carry the toolbox through every step. In a pair, one player can inspect and hold the toolbox while the other fetches the pin. Either player can fit and test.

- **Pin:** if the player carrying the pin disconnects, the pin goes back to the bench at once.
- **Toolbox:** the toolbox follows the usual carry rules. A carrier who disconnects keeps it for the reconnect grace period (12 s on land). After that it drops where they stood. Talking to Wren puts the toolbox back on the mending bench whenever no connected player is holding it, including during a carrier's grace period. An unsafe respawn also sends it back to the bench.
- **Late joiners:** the crew guide and the mission card build a favor entry from the shared state: who needs help, the fault, where the toolbox is, and the next useful action. The mission card shows the favor while no other mission or order is on it. A crewmate who joins mid-job sees the same entry without having spoken to Wren.

## Saved state

The host saves the repair stage, the time the job was accepted and the gate was mended, whether the gate is open, Wren's trust, the last favor receipt and the toolbox position. Island saves are version 3. Version 1 and 2 saves gain the toolbox on the bench and an untouched gate when loaded. A carried pin returns to the bench when the host restarts.

## Playtest

- Start at the cottages without a toolbox. Without reading the guide, can a fresh player find the defect and tell from the gate itself whether the repair worked?
- Run the job solo while holding the toolbox the whole time, then as a pair with one player inspecting while the other fetches the pin.
- Disconnect the toolbox carrier halfway through. Have the partner talk to Wren to recover the toolbox and finish the job. Reconnect the carrier and check that there is still exactly one toolbox and one payout.
- Press **Fit** and then **Swing** on both clients at the same moment. Check for one payout, one trust change and a gate that stays open for both players.
- Restart the host after the repair, sleep to dawn, and follow Wren from the cottage. Check that Wren walks through the gate, the groove has gone, and greeting Wren again adds no coins or trust.
