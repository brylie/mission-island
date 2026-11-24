# Forest roads

**Type: explanation (practice). Real world: draft, unsourced: the two sources below could not be opened yet. On the island: playable**, see [the fire road](../../backcountry.md#fire-road). Last tended 2026-11-23. Model purpose: **illustrate** how a road is fitted to hilly ground. The game models the road's shape and earthworks, not soil, water or wear.

A forest road is the cheapest road that lets the vehicles a job needs reach the places it needs to reach, in most weather, without washing away. Fire crews, foresters, rangers and farmers depend on them. Most of what makes one look the way it does comes from three limits: how steep a loaded vehicle can climb, how tightly it can turn, and where the rain goes.

Source ids in brackets point to entries in the [sources register](../../sources.yaml). Both sources for this page are registered but unopened, so every real-world figure here is still unsourced until someone reads them.

## Recognise it

- **Long straight runs where the ground allows.** A road costs money per metre, so builders take the short line unless the slope forbids it. Wiggles on level ground are a sign of a racing circuit or a park drive, not a working road. That is still unsourced.
- **Curves that follow the hill.** On a slope the road bends with the contours, holding its height while it works round a spur or into a side valley.
- **Switchbacks.** Where a road must gain height on a steep face, it climbs across the slope, turns back in a tight hairpin, and climbs across again.
- **A bank on one side, a drop on the other.** Cut into a hillside, the road leaves a cut bank above it and an embankment of the spoil below it.
- **Two wheel ruts.** Vehicles keep to the same lines, so packed tracks form with a looser, often grassy strip between them.

## How it is built

### Grade

Grade is the rise per hundred metres along the road, as a percentage: a 10% grade climbs 10 m in 100 m. A New York State standard for unpaved forest access roads allows a sustained grade of 10% and short pitches of 15% (`nydec-unpaved-forest-roads`). Both figures are still unsourced, because the document could not be opened. Steeper roads lose traction in wet weather, need more braking downhill, and wash out faster, because water running down the road gathers speed.

To climb a hill steeper than the road may be, the road is made longer: across the slope rather than straight up. A switchback is the turn at the end of each traverse. Its radius has to suit the longest vehicle that uses the road. The same New York standard gives a minimum curve radius of 50 ft, about 15 m (`nydec-unpaved-forest-roads`). That is still unsourced.

### Cut and fill

Most of a road's cost is moving earth. On a side slope, earth dug from the uphill side (the **cut**) is pushed to the downhill side (the **fill**). When the two are about equal, the road is "balanced" and no earth has to be carted in or away. That is still unsourced.

The slopes left beside the road are called **batters**. A cut in firm soil can stand steeper than a fill of loose spoil, so cut banks are typically steeper than embankments. The Forest Service guide for low-volume roads gives typical ratios for both (`usfs-low-volume-roads`). That is still unsourced.

### Water

Water is what destroys forest roads. The road surface is shaped to shed rain sideways, before it can run far along the road:
- **Crowned:** higher in the middle, falling to both sides.
- **Outsloped:** tilted toward the downhill edge, so water runs straight off. On narrow roads this is easier to build and keep than a crown, and the Forest Service guide gives 3–5% as a typical outslope (`usfs-low-volume-roads`). That is still unsourced.
- **Insloped:** tilted toward a ditch at the foot of the cut bank.

Water in a ditch, or running down a long grade, has to be let out under or across the road at intervals. **Cross-drain culverts** are pipes under the road. **Rolling dips** are broad, gentle dips that a vehicle drives through without slowing much, sloping out to let the water off. The Forest Service guide's table spaces them closer together as the grade and the soil's erodibility rise (`usfs-low-volume-roads`). That is still unsourced.

### Fords

Where a small stream crosses a road and is usually shallow, a **ford** or low-water crossing is often cheaper and tougher than a bridge or culvert. The road dips to the stream bed, which is paved or armoured with large stone so the water flows over it. A ford is closed when the stream is in flood. That is still unsourced.

## How it changes

- **Ruts deepen** in wet seasons, and water runs in them, so a rut can become a gully.
- **Banks slump** after heavy rain, especially fresh cuts with no plants on them. Ground cover regrows on batters within a few years.
- **Unused roads green over**: grass first in the strip between the ruts, then shrubs and young trees. That is still unsourced.

## In the game

The island's roads are laid out in the Workbench [road designer](../../workbench.md#design-roads) and shape the ground itself. The [architecture page](../../architecture.md#graded-roads) follows the data.

| Real road | Island road |
| --- | --- |
| Grade limit | 12% for a fire road and 16% for a track, held by the profile solver. A stretch can be given its own limit; the Cairn Summit spur climbs at up to 15%. |
| Curve radius | 8 m for a fire road: the tightest bend the Fire and Rescue pickup turns without shunting. The designer warns about tighter bends. |
| Route | Suggest route finds a path within the grade, then pulls it straight wherever a straight road holds the grade. Curves are left only where the road follows a contour or switches back. |
| Cut and fill | The road is cut into rises and built up over hollows, never more than the grade needs. Cut banks stand at 1:1 and fills at 1:1.5. |
| Batters | Trees and fallen logs keep off any ground the grading moved by more than 15 cm. Grass, ferns and heather grow on the banks, as ground cover would within a few years of building. |
| Cross-section | A 4 m road with 1 m shoulders, crowned 5 cm, with two darker wheel ruts. |
| Drainage | Not modelled. Where a road dips, rain has nowhere to go, as there are no culverts or rolling dips yet. |
| Fords | The fire road dips into the Alder Creek valley and crosses its bed. A stone ford is still to come. |

The real-world figures above are for comparison and are still unsourced. The game's own numbers are design choices, set in [`route-profiles.ts`](../../../src/assets/geometry/route-profiles.ts).

## Notice this

Walk the Cairn Summit spur and stop where the road turns back on itself. Look at the slope above and below. Why could the road not go straight up?

## A resident might say

"They built that road for the fire truck, not for a Sunday drive. Straight where they could, round the hill where they had to."

## Sources

- `usfs-low-volume-roads`: Keller and Sherar, *Low-Volume Roads Engineering: Best Management Practices Field Guide*, USDA Forest Service and USAID, 2003. Not yet opened: its pages refused automated fetches.
- `nydec-unpaved-forest-roads`: New York State Department of Environmental Conservation, standards for unpaved forest access roads. Not yet opened: the request timed out.
