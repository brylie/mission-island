# Foot contact on Starter Island

The automated run used two browser clients on the live playtest host. One held **W** along Seabrook’s 12 m pavement lane while the other recorded from the fixed side view. Each pass started from a fresh checkpoint with the same default outfit and daylight. The sprint used **Shift** and the carry used the crate from the starting line. A separate checkpoint replayed Mara’s morning route from her porch to the fishing dock.

## Rendered measurements

The browser sampled the centre of each boot sole in world coordinates at about 60 frames per second. Drift is the horizontal distance from the first to the last frame of the same foot’s stance. The baseline uses the original leg swing’s intended stance interval. Distance and time between contacts use alternating footfalls in the tuned gait.

| Pass | Median drift before | Median drift after | Distance between contacts | Time between contacts |
| --- | ---: | ---: | ---: | ---: |
| Walk | 1.71 m | < 0.01 m | 1.18 m | 0.150 s |
| Sprint | 1.56 m | < 0.01 m | 1.61 m | 0.133 s |
| Crate carry | 1.31 m | < 0.01 m | 0.99 m | 0.150 s |
| Mara’s commute | 0.03 m | < 0.01 m | 0.52 m | 0.217 s |

The follow and side cameras showed the same contact behaviour. The Crew Workbench used the gameplay cadence at its default stride setting. The server still moves the crew at 8 m/s walking, 12.4 m/s sprinting, and 6.5 m/s carrying on dry level ground. Mara keeps the same five-second commute.

The gait regressions check distance-to-phase, foot clearance, a planted foot through a bend and on a gentle slope, and settling to idle when horizontal movement stops. The launcher tests cover solo and two-seat starts, normal crate pickup, and the original travel speeds.

The human playtest still needs both players to swap roles and record how starts, stops, wall blocks, turns, and slopes feel. [Starter Island playtest record #52](https://github.com/brylie/mission-island/issues/52)
