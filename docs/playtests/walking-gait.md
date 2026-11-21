# Foot contact on Starter Island

The automated run used two browser clients on the live playtest host. One held **W** along Seabrook’s 12 m pavement lane while the other recorded from the fixed side view. Each pass started from a fresh checkpoint with the same default outfit and daylight. The sprint used **Shift** and the carry used the crate from the starting line. A separate checkpoint replayed Mara’s morning route from her porch to the fishing dock.

## Earlier flat-sole fit

The browser sampled the centre of each boot sole in world coordinates at about 60 frames per second. Drift is the horizontal distance from the first to the last frame of the same foot’s stance. The baseline uses the original leg swing’s intended stance interval. Distance and time between contacts use alternating footfalls in the tuned gait.

| Pass | Median drift before | Median drift after | Distance between contacts | Time between contacts |
| --- | ---: | ---: | ---: | ---: |
| Walk | 1.71 m | < 0.01 m | 1.73 m | 0.217 s |
| Sprint | 1.56 m | < 0.01 m | 2.31 m | 0.183 s |
| Crate carry | 1.31 m | < 0.01 m | 1.43 m | 0.225 s |
| Mara’s commute | 0.03 m | < 0.01 m | 0.60 m | 0.250 s |

Playtest feedback described the first foot-plant pass as unnatural. The side view showed bent knees and quick steps. The revised fit uses the original knee and ankle swing during recovery and lets the supporting leg straighten. Walking contacts moved from 0.150 to 0.217 seconds apart, and the supporting soles held against the pavement marks.

## Heel strike and toe-off

The next side-view review found the knees still looked crouched and the soles stayed flat during contact. The current walk uses the planted heel to lower the forefoot, transfers weight across the sole, then raises the heel around the planted toe. The pelvis follows the supporting ankle. The recovering leg uses the original swing curve with clearance for the shoe. Cadence still comes from the distance travelled.

In a two-client Seabrook walk, the rendered supporting knee measured 6.9° from straight across 52 contact samples. The largest displacement between successive frames on the same supporting edge was under 1 mm. This measures the heel during landing and the toe during push-off. The sole centre in the earlier table moves as the shoe rolls.

The follow and side cameras showed the same contact behaviour. The Crew Workbench used the gameplay cadence at its default stride setting. The server still moves the crew at 8 m/s walking, 12.4 m/s sprinting, and 6.5 m/s carrying on dry level ground. Mara keeps the same five-second commute.

The gait regressions check distance-to-phase, foot clearance, a planted foot through a bend and on a gentle slope, and settling to idle when horizontal movement stops. The launcher tests cover solo and two-seat starts, normal crate pickup, and the original travel speeds.

## Swing smoothness

A two-client side recording exposed a pulse in the whole walker as each network position arrived. Grounded crew now interpolate along the recent host track, and the shoe accelerates away from toe-off and decelerates into heel strike. In the middle eight metres of two Seabrook recordings, the median frame-to-frame change in forward swing-foot speed dropped from 2.55 to 0.62 m/s. This compares consecutive rendered frames in swing, including their intended acceleration. It is a playback comparison, not a target for human gait.

In Crew Workbench, open **Gait trace** during walk, carry, or sprint. Pick a leg and scrub across the shaded stance interval to see the forward ankle velocity and knee angle on the posed rig. The velocity includes travel over the ground. Playback loops on a whole number of strides.

## Recovery between plants

Playtest feedback on the planted gait was that the crew looked like they were moonwalking. The crew travel at 8 m/s on legs about half a metre long, so a sole that holds its place on the pavement can stay down for only about 0.07 seconds. In that pass the foot spent the remaining 86% of each stride drifting forward about 2 cm above the ground. The eye read the long, low forward drift as a foot sliding along the pavement.

The walk now takes quicker steps with a longer contact sweep, which shortens the time between plants. The rear knee bends to bring the foot through with the shoe held clear of the ground, and the supporting leg stays nearly straight. Contact sits slightly behind the hip so the pelvis is at the same height at landing and push-off. The sprint uses a running recovery instead, where the shin folds up behind the hip before the knee drives forward. Planted soles still hold their place, and travel speeds are unchanged.

| Pass | Distance between contacts | Time between contacts | Share of the stride each sole is down | Largest knee bend in recovery | Head bob |
| --- | ---: | ---: | ---: | ---: | ---: |
| Walk | 1.25 m | 0.156 s | 25% | 70° | 3.7 cm |
| Sprint | 1.80 m | 0.145 s | 18% | 131° | 3.9 cm |
| Crate carry | 1.05 m | 0.161 s | 27% | 67° | 2.9 cm |

These figures come from the gait model on level ground, not from a recording. The earlier walk left 0.217 seconds between contacts with each sole down for 14% of the stride. Because both feet are off the ground between plants at these speeds, the walk is a brisk, low-stepping gait and cannot have the double support of a stroll. Whether it reads as a natural walk in motion still needs a human check in the Seabrook side view.

The human playtest still needs both players to swap roles and record how starts, stops, wall blocks, turns, and slopes feel. [Starter Island playtest record #52](https://github.com/brylie/mission-island/issues/52)
