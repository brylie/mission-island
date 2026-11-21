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
  - **Island survey flight:** once the Mirror Pool survey is recorded. Fly anywhere, record aerial surveys and land anywhere safe. See [Soaring the island](#soaring-the-island).
- **Landing.**
  - The host settles each landing in one step: it awards any credit, returns the wing to the rack and tells both players **Wing returned to Windstone Ridge**.
  - A safe landing leaves the pilot where they touched down, including a short one.
  - A landing in water, on a prop or on the truck puts the pilot back on reachable ground near the launch or the meadow.

## Soaring the island

Every place a player can discover on foot also has an **aerial survey**. Once the Mirror Pool survey is done, the rack lends the wing for island survey flights.
- **Recording a survey.** Pass within 12 m of a place while at least 4 m above the ground, and the pilot sees that it was spotted. A safe landing anywhere records every place spotted on that flight for the whole crew. A crash, a landing in the sea or a disconnect loses that flight's sightings. A place already recorded adds nothing.
- **What the pilot sees.** The HUD shows the height above ground, the nearest working lift with its bearing and distance, and the nearest place still unsurveyed. Free flights have no orbs, so pilots steer by the rising air and those bearings. The minimap marks working lift in lilac and unsurveyed places in gold.
- **Rewards.** Aerial surveys are crew progress, saved with the island. Older saves start with none. They pay no coins, like the [field journal](field-journal.md).

The glider has roughly a 3:1 glide, so the ridge alone reaches only the places near it. Rising air sits where the land would make it. The training wind blows from the southeast, so it lifts over slopes that face it. On a sunny day, dark soil, rooftops and bare rock warm faster than the grass around them and send up thermals. Rising motes show each column: lilac for ridge lift, warm gold for a thermal. Circle with the nose up to climb, and leave near the top.

**Gulls in the lift.** From 07:00 to 17:30, two gulls circle in each working lift site with their wings held still. They climb tight in the core and drift wider as they glide back down. A strong thermal holds both birds. An early-morning or showery thermal holds one, and the ridges keep both because the wind still blows. Heavy rain sends them to shelter. A gull joins or leaves only near the top of its climb, so none pops in low beside the pilot. Gulls are an approximate guide: [their tests](../../test/gull-thermals.test.mjs) check that a circling gull always sits in air that would lift the wing. The motes stay the exact readout, including at night when the gulls roost. To watch them, open **Gulls circling the farm thermal** in the Landscape Workbench's scenic views and press Play.

| Lift | Kind | Where and why | Works |
| --- | --- | --- | --- |
| Windstone shoulder | Ridge | The windward face of Windstone Ridge | Always |
| Juniper slope | Ridge | The southeast face of the Juniper Hollow hill | Always |
| Fernfall ledges | Thermal | Bare rock ledges beside the falls | About 07:00–19:00 |
| Lookout clearing | Thermal | The open crown by Forest Lookout | About 07:00–19:00 |
| Seabrook rooftops | Thermal | Roofs and paving in town | About 07:00–19:00 |
| Island Farm fields | Thermal | Dark, tilled soil | About 07:00–19:00 |

Thermals build through the morning, peak after noon and fade before dusk. Rain cuts them to a fifth of their strength. The [lift definitions](../../src/worlds/starter/lift.ts) hold the positions, radii, ceilings and strengths.

**Routes the tests fly.** [Island soaring tests](../../test/island-soaring.test.mjs) fly each route from the rack with a patient autopilot, at 09:30, 13:00 and 16:30:

| Place | Route |
| --- | --- |
| Mirror Pool | Straight off the launch |
| Windstone Ridge, Fernfall | Climb on the Windstone shoulder |
| Juniper Hollow | Windstone shoulder, Fernfall ledges, Juniper slope |
| Shellglass Tide Pool, Splitstone Narrows | Windstone shoulder, Fernfall ledges, Lookout clearing, Seabrook rooftops |

At night, or in rain, only the places reachable on ridge lift can be surveyed.

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
- Fly the checkout while the partner marks the meadow. Swap and fly the survey. Then take an island survey flight, pass over a place found on foot, land away from the meadow and check that both players see the same aerial survey count and no coins change.
- Disconnect mid-flight, then restart the host after qualifying. Check that there is one grounded pilot, one wing on the rack, and that the qualification is still there.
- Land short on purpose and walk back to the windsock.

The milestone's manual run is tracked in the [Starter Island checklist](https://github.com/brylie/mission-island/issues/52).
