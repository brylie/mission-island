# Ridge gliding: the crew's aviation checkout

**Playable.** A free hang-glider waits on the orange loan rack at Windstone Ridge, on the northern hills. A windsock beside the rack points down the slope to a broad meadow with a landing circle. A crew that lands inside the circle after flying the approach earns a shared aviation qualification. Either player can then fly the Mirror Pool survey. [Issue #94](https://github.com/brylie/mission-island/issues/94)

## The course as flown

These positions come from the playable wing and the [ridge scout definitions](../../src/worlds/starter/ridge-scout.ts). They are map coordinates in metres.

| Feature | Position and size | Why it is there |
| --- | --- | --- |
| Launch | (39, 128), wing starting 0.65 m above the ground | The crown is level enough to stand on, and the meadow is visible below |
| Loan rack and windsock | Either side of the launch, facing the meadow | A newcomer standing at the rack looks straight down the flight line |
| Landing circle | Centred on (61, 102), radius 6.6 m | About 38 m from the launch and 14.4 m lower. A neutral glide lands within 1 m of the centre |
| Approach | A corridor 14 m wide, from 17 m before the centre to the edge of the circle | The checkout counts only after the pilot has flown through it |
| Updraft | Off the windward shoulder, 8.5 m radius, rising lights | Banking left after launch gives an optional climb |
| Walking return | Meadow → (48, 116) → launch | Pilots who land in the circle or short of it can walk back up |
| Landing sign | Beside the meadow, on the side facing the ridge | Spotters use it to mark the circle |

**Clearance.** In the scout tests, the wing and pilot stay more than 0.5 m clear of the terrain and props for the first 7 m and for the whole flight, both on a neutral glide and with a modest correction either way. The wing levels out before touchdown. A steady training wind of 0.35 m/s blows down the flight line. [Scout tests](../../test/ridge-scout.test.mjs)

## Flight and the loaner

- **Borrowing.** Stand at the rack on foot with free hands and press **E** to launch. The wing is free.
  - Only one wing exists. When both players press at once, the host lends it to one of them, and the other sees **Your crewmate has the wing**.
  - The launch strip has to be clear; if it isn't, the pilot is told to clear it.
- **Controls.**
  - **A/D** or **←/→** bank the wing, and a held bank turns tighter.
  - **W** lowers the nose for speed. **S** raises it to slow the descent.
  - Steering is relative to the wing, so turning the camera or switching to island view never changes the heading.
  - If you let go, or input stops arriving, the wing settles into a stable glide.
- **What each outing asks.** The rack names the next outing before you borrow:
  - **Checkout:** follow the blue approach orbs and land inside the circle.
  - **Mirror Pool survey:** fly at least 2 m up within 7 m of the fallen willow on the east bank of Mirror Pool, then land inside the circle. The rack gives the willow clue before launch.
  - **Practice flight:** once the survey is recorded. It earns nothing more.
- **Landing.**
  - The host settles each landing in one step: it awards any credit, returns the wing to the rack and tells both players **Wing returned to Windstone Ridge**.
  - A safe landing leaves the pilot where they touched down, including a short one.
  - A landing in water, on a prop or on the truck puts the pilot back on reachable ground near the launch or the meadow.

## Credit and recovery

- **The qualification belongs to the crew.** It is saved with the island, and the survey observation is saved separately. Either player can fly the survey without a checkout of their own. Saves from before the glider load unqualified. Flights pay no coins.
- **Credit comes only from a safe landing that completes the outing.** Walking or respawning near the willow gives nothing. A survey landing without the airborne pass gives nothing, and neither does a checkout landing that skipped the approach.
- **Interruptions.** If the pilot disconnects mid-flight, or the host restarts while a flight is in the air, the pilot goes back on reachable ground and the wing returns to the rack. A disconnect or restart just before or after the qualifying touchdown always ends with one grounded pilot, one wing on the rack, and the qualification earned only if the landing completed.

## Roles

A solo pilot can find the circle from the rack, follow the orbs and finish without a partner or voice chat. With two players:
- The spotter can walk to the landing sign and press **E** to **Mark the meadow**. This turns the circle teal on both screens until the next landing. The circle and the scoring area stay the same either way.
- Spotters can also wait with the truck at the meadow, or watch for a short landing.
- Swap roles for the survey.

## Playtest

- Before the first launch, without coaching, ask: "Where are you going to land, and what will you do if you come up short?"
- Fly the checkout while the partner marks the meadow. Swap and fly the survey. Then take a practice flight and check that neither the coins nor the crew's records change.
- Disconnect mid-flight, then restart the host after qualifying. Check that there is one grounded pilot, one wing on the rack, and that the qualification is still there.
- Land short on purpose and walk back to the windsock.

The milestone's manual run is tracked in the [Starter Island checklist](https://github.com/brylie/mission-island/issues/52).
