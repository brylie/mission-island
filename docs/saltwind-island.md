# Saltwind Island development preview

Open `/second-island.html` from the Vite server or use **Saltwind preview** on the starter island. The preview opens on the Brinewick ferry. **Start tour** follows the road and pauses in each village. **WASD** or the arrow keys take over on foot, **Shift** runs, drag orbits the camera, and the wheel changes how close you stand to the crew. **C** opens the overview, **M** opens the site chart, and **Inspect site** places the crew at the nearest surveyed road access. Discoveries appear as you approach landmarks and last for the preview session.

Walking or inspecting a landmark pauses the guided tour. Starting or continuing it returns the crew to the saved position on the route. Restarting a completed tour takes the crew back to the ferry.

## Slatecliff ore hauling

Earn your Slatecliff ore truck certification by hauling ten crates on Starter Island. Drive each crate at least eight metres on the flatbed. When the crew delivers it, each qualifying driver earns 10 personal driver XP. At 100 XP you can board the ore truck and accept freight contracts. After the starter missions, take repeat delivery orders at the Harbor Job Board to finish your practice.

On Saltwind, use **Site map → Slatecliff Mine → Inspect site** and walk to the ochre truck on the turnaround. Press **F** to board. Pick a contract at the dispatch bay, then steer to the cones beside the hopper. Use **W/S** to drive or reverse, **A/D** to steer and **Space** to brake. Choose the ticketed ore and press **Load selected ore**. The orange diamond on the chart follows the current objective. Stop between the buyer’s cones and unload to credit the crew bank. Drive back to dispatch for another ticket.

| Ore | Buyers and uses |
| --- | --- |
| Magnetite | Brinewick freight quay buys workboat ballast. Barleycross School buys specimens for its navigation class. |
| Malachite | The farmers market buys banded stone for a lapidary stall. The quay buys copper ore for export. |
| Honey calcite | The school buys geology samples. The farmers market buys carving blocks for its stoneworkers. |

## Tour

| Stop | X, Z (m) | What to inspect |
| --- | ---: | --- |
| Brinewick Ferry | −274, −266 | Walk up the 8 m wide vehicle ramp to the quay. Take the west spur to the rescue slip or east to the fishing pier. |
| Brinewick | −270, −105 | Inspect the striped fish market and its delivery apron, then look across the main road to the police station. The grocery and apartments sit west of the ferry approach. |
| Barleycross | 162, −65 | Follow the main road east past the airfield turn. Inspect the farmers market and its apron, then follow the bend past the school and the Long Acre field access. |
| Alderwatch | −56, 158 | Climb past the hospital and helipad. The fire station and church face the village road. Keep west to see the tarn, waterfall and sawmill. Inspect Slatecliff Mine from the east road. |
| Scenic return | −351, 12 | Complete the loop through Reedwater Valley, cross Reedwater Bridge, then follow the waterfront back to the ferry. Mill Road gives a second route between the inland junction and the south road across Mill Bridge. |

## Map and site inventory

The in-game site chart shows the full route network, named biomes and all survey pins. North is +Z, +X is east, and one world unit is one metre. Y is metres above the Saltwind sea datum. The land survey spans X −505 to 505 and Z −340 to 340. The local coast and water chart spans X −560 to 560 and Z −430 to 430. Saltwind coordinates are local to this island.

| Site | Centre X, Z (m) | Reserve (m) | Staged exterior and service space |
| --- | ---: | ---: | --- |
| Brinewick Ferry | −274, −211 | 38 × 57 | Ferry, drive-off ramp, cargo stacks and turnaround quay. Arrival on deck at (−274, −266). |
| Fish Market | −237, −126 | 52 × 56 | Fish hall, striped awning, stalls and 21 × 33 delivery apron. Stop (−222, −125). |
| Police Station | −247, −74 | 37 × 36 | Station, marked apron and patrol car. Park (−237, −82). |
| Quay Apartments | −303, −138 | 32 × 30 | Three-storey exterior, entry steps and parking reserve (−298, −130). |
| Brinewick Grocery | −313, −77 | 40 × 32 | Grocer, entry canopy and service reserve (−302, −78). |
| Farmers Market | 166, −35 | 64 × 45 | Covered market, stalls and 26 × 31 delivery apron. Stop (184, −35). |
| Long Acre Fields | 140, 31 | 118 × 70 | Crop rows and space to approach from the east field lane. Pickup (189, 33). |
| Barleycross School | 264, −33 | 47 × 42 | Schoolhouse, bell tower and forecourt. Stop (253, −32). |
| Saltwind Hospital | 116, 113 | 72 × 47 | Hospital, two ambulance approaches across the north forecourt and 18 m helipad at (115, 111). Ambulance (136, 113). |
| Alderwatch Church | −23, 188 | 33 × 32 | Chapel, tower and steps. Stop (−14, 181). |
| Alderwatch Cemetery | 20, 190 | 43 × 36 | Low walls and rows of headstones with a south opening. Gate (20, 178). |
| Alderwatch Fire Station | −57, 188 | 34 × 43 | Two engine bays, drill tower and 24 × 21 m apron with two road approaches. Fire engine (−59, 177). |
| Alder Timber Works | −227, 155 | 70 × 60 | Sawmill, log stacks and 33 × 35 m yard. Load (−226, 153). |
| Slatecliff Mine | 266, 160 | 67 × 63 | Portal and hopper exterior, ore piles and 32 m turnaround pad. Dispatch (288, 156), hopper (282, 171.5). |
| Saltwind Airstrip | 187, −126 | 116 × 44 | Hangar, windsock, staging apron, taxi connector and parked airplane (183, −132). The separate 420 × 22 m runway is centred at (46, −162) on an east–west heading. Each end has a 105 m approach corridor. |

Other pins include Sandspit Fishing Pier (−253, −260), Brinewick Rescue Slip (−311, −225), the skiff launch (−311, −239), Reedwater Bridge (−351, 12), Mill Bridge (−204, 53), Mirror Lake (−84, 104), Tarnstep Viaduct (−124, 153), and Tarnstep Falls (−120, 184). The chart shows Brinewick Coast, Reedwater Valley, Barley Meadows, Alder Crown and East Bluff.

Conifers and alders surround the interior roads. Reed beds follow wet banks, shore grass clumps follow the coast, and flowering meadow and crop meshes are instanced. Gulls circle the quay, woodland birds pass over Alder Crown, mallards swim on Mirror Lake, hares move in field and forest clearings, and a small school of mullet moves off the fishing pier. Small plants and wildlife are distance-limited. Buildings and vehicles reuse procedural parts and matching materials.

## Vehicle assets

Vehicle models are available in **Asset Workbench → Saltwind vehicles**. The named buildings are in **Saltwind buildings**. These exteriors use metre scale. The origin is the ground plane at the vehicle centre, +Z faces forward, +X is right, and +Y is up. Axles below give front/rear contact coordinates as local Z values. For each road axle the contact points are X = ± half-track, Y = 0. Wheel centres use the same X/Z and Y = radius.

| Asset | W × L × H (m) | Ground contact (m) | Parking or pickup |
| --- | --- | --- | --- |
| Ambulance | 2.32 × 6.1 × 2.9 | X ±0.89, Z −1.75, +1.95. Radius 0.40. | Hospital (136, 113), north-facing. |
| Fire engine | 2.55 × 8.2 × 3.25 | X ±1.03, Z −2.62, −1.42, +2.70. Radius 0.52. | Fire apron (−59, 177), south-facing. |
| Patrol car | 1.92 × 4.75 × 1.65 | X ±0.74, Z −1.49, +1.37. Radius 0.32. | Police apron (−237, −82), south-facing. |
| Logging truck | 2.55 × 10.2 × 3.6 | X ±1.02, Z −3.6, −2.35, +3.28. Radius 0.54. | Timber yard (−226, 153), north-facing. Bunk 2.22 × 6.55 × 1.9 m, floor Y 1.29, centre Z −1.35. |
| Ore truck | 2.55 × 8.8 × 3.4 | X ±1.02, Z −2.97, −1.72, +2.80. Radius 0.54. | Dispatch (288, 156), east-facing. Bin 2.17 × 5.28 × 1.36 m, floor Y 1.25, centre Z −1.29. |
| Rescue helicopter | 10.2 × 11.65 × 3.35 | Skids X ±0.90, Y 0. | Hospital helipad (115, 111), heading 0.38 rad. |
| Utility airplane | 10.8 × 7.6 × 2.8 | Main gear X ±0.98, Z 0.40, nose gear X 0, Z 2.42. Y 0. | Airfield apron (183, −132), south-facing. |

The first pass includes every listed vehicle and site exterior. Queued models and asset work include civic interiors, an actual mine opening and interior, vehicle interiors and animated doors, ambulance equipment, rigging and steering, tied log loads, and aircraft control surfaces. The parked skiff and ferry need moving hull and boarding rigs once travel and rescue gameplay are designed.

## Future travel and physics

- Choose the initial travel unlock rule, where the offer appears on the starter island, and how the player returns. Test both unlocked and locked states and reject invalid transitions on the host. The ramp already provides an arrival route and the apron provides crew and cargo space.
- Choose continuous placement or per-map loading. Assign an island ID consistently across world transforms, spawn and return markers, saves and snapshots, asset streaming, map discovery, weather, and multiplayer handoff. Existing starter coordinates must retain their meaning for earlier saves. Update save decoders and migration tests once travel can persist.
- The preview samples the same terrain triangles, road deck triangles and apron heights it draws. The host needs matching separate terrain and deck colliders for vehicles, crew and loose cargo. Bridges and the ferry need deck/rail colliders and clearance below. Bring the shore depth and launch data into boating and wading rules. Run a loaded-truck swept-path and contact test at road joints, the ferry ramp, markets, sawmill and mine when the vehicle simulation is integrated.
- Connect the Saltwind model factories to shared rendering and visual vehicle state when the host owns those vehicles. The staged exteriors have no effects, drivetrain, seat or cargo attachment state. Script jobs against named loading areas and landing circles after the job and vehicle systems are defined.
