# Saltwind preview QA

## Area and geometry

Saltwind has **0.428 km²** of dry land, about **11.3×** the starter island’s stated 0.038 km². The survey counts terrain samples above their local water surface and excludes the seabed, river, lake and tarn. Sampling on 1 m and 2 m grids gave 0.428370 and 0.428312 km². The values describe the dry terrain footprint, which includes steep slopes and the waterfall banks.

| Route or site | Checked in the preview or by geometry tests |
| --- | --- |
| Ferry, quay and return | Walked from the ferry at (−274, −266) to (−274, −225). The 8 m ramp and land approach share a height at the join. The ramp reaches a 12.6% centreline grade. |
| Saltwind Loop | Completed the 1.46 km route from Brinewick to Barleycross to Alderwatch and back through Reedwater Valley. The 9 m pavement reaches 13.6% centreline grade with a minimum sampled centreline curve radius of about 24.7 m. |
| Mill Road and Slatecliff Road | Checked both spurs against the rendered surfaces. Mill Road runs 234 m with an 8.8% peak centreline grade. Slatecliff Road runs 97 m and reaches 15.9% at the quarry approach. |
| Reedwater Bridge, Mill Bridge and Tarnstep Viaduct | Checked deck and approach joins, raised support above the water, and the open stream below the viaduct. Inspected the waterfall and one-metre route samples. |
| Quay spurs | Checked the pier’s dry deck and the rescue slip’s wading-to-boating transition. At (−311, −238) the water is about 0.83 m deep and both draft thresholds apply. The launch at (−311, −239) is about 1.03 m deep. The slip reaches a 19.5% grade at the water. |
| Markets, emergency sites and industrial yards | Inspected building foundations, entry height and the marked delivery and loading areas. Checked the six market and emergency access lanes against the road and apron surface. |
| Airfield | Checked the level 420 × 22 m strip, apron, taxi connector, parked airplane and 105 m clear approach corridors. |

Preview walking uses the same terrain and deck triangles as rendering. Parked models are visual staging. A host integration needs static terrain/deck/rail colliders, actual truck width and wheel contact tests under load, boat draft and bridge-clearance tests, ferry attachment, and cargo handling on the aprons. The physical traversal checks in this pass cover walking.

## Starter compatibility and automated checks

The branch starts at `376ee07`. Saltwind retains compatibility with the starter terrain, world coordinates, server protocol and save schema. The starter save-and-resume, skiff reconnect, persistent discovery and named-slot tests passed. The preview uses local in-memory state and opens no starter save. A Git merge-tree check with the parallel flatbed branch at `38d3c3c` found no conflict.

`npm run quality` passed lint, unused-code checks, the 28-test suite with coverage gates, TypeScript and the Vite production build. Four tests cover Saltwind area and bounds, tour continuity, road/bridge geometry, and water-access and staging surfaces. Vite still emits its bundle-size warning for the shared Babylon chunk.

## Same-machine browser performance

Measured the production build in Brave 157 on an Apple M1 Pro MacBook Pro with the Metal renderer and a 1440 × 828 WebGL drawing buffer in both previews. The three alternating navigations per island used a disabled HTTP cache and a local server with saves disabled. Load time runs from navigation to the playable view. Frame rates are medians of 3.5-second animation-frame samples after one second of settling in each camera mode. The follow samples use each island's starting location.

| Preview | Median ready time | Ready times | Overview | Third person |
| --- | ---: | --- | ---: | ---: |
| Starter | 0.448 s | 0.550, 0.448, 0.387 s | 59.8 FPS | 59.8 FPS |
| Saltwind | 0.745 s | 0.791, 0.745, 0.740 s | 60.0 FPS | 59.9 FPS |

Saltwind took 0.297 seconds longer to reach the playable view. Both previews ran near the browser's 60 FPS refresh ceiling in the measured views. Brave reported no console errors during the guided tour and workbench checks. The three-run comparison preceded a localized mine pad clipping correction, which was checked in a follow-up production smoke pass.
