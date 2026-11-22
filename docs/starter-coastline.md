# Starter Island coastline

From Island view, look for the bite in the south coast beside the harbor, the point beyond Windstone Ridge, and a quieter strand from Driftwood Beach toward Shellglass. At shore level, the harbor still has a dry approach to the fishing dock and a separate road to the closed ferry terminal. At Driftwood, follow the sand past the tide pool to the Splitstone cleft.

![Before and after views of the island silhouette, the fishing dock approach, and the Driftwood shore](images/starter-coastline-comparison.jpg)

The cove sits on the south edge and the Windstone point on the northeast edge. Both Island views are in clear daylight, at 13:39 before and 13:21 after. Both shore-level pairs use the same camera settings and clear daylight at 13:00.

## Coast controls

The [Starter Island coast definition](../src/worlds/starter/coastline.ts) uses seed **101**. It measures distance along the surveyed shoreline so each feature and noise band has a consistent scale in metres. Bearings locate the centres in the terrain mesh's angular coordinates. Zero points east and 90 points north. Displacements are measured along the ray from the island origin. Positive values extend the shore seaward. Each displacement eases to zero over its half-width in each direction.

| Landform | Centre bearing | Half-width | Displacement |
| --- | ---: | ---: | ---: |
| Outer harbor shoulder | 210° | 34 m | +12 m |
| Harbor cove | 248° | 30 m | −9 m |
| Southern shoulder | 275° | 29 m | +11 m |
| Windstone point | 70° | 65 m | +24 m |
| Windstone east flank | 43° | 53 m | −14 m |
| Windstone west flank | 100° | 70 m | −12 m |
| Northwestern indentation | 142° | 76 m | −15 m |

The [shared noise functions](../src/math/noise.ts) layer periodic, centered value noise at target wavelengths of 64, 24, and 9 m with maximum displacements of 4.2, 1.6, and 0.45 m. Each wavelength is rounded to a whole number of intervals around the island so the field joins at the seam. The harbor shelf is fixed for 13 m on either side of bearing 231°, then transitions over 9 m. The quiet Driftwood–Shellglass shelf is fixed for 21 m on either side of bearing 314°, then transitions over 13 m.

The terrain, maps, depth texture and host sample the same contour. The skiff boundary remains 75 m farther out along each ray. The 24 visible buoys and the map boundary both use the same limit as the host's hull checks. A returning player inside the boundary can resume as a swimmer if the shore moved under them. The host moves an on-foot player outside the new boundary to their cottage and returns a stranded skiff to its harbor launch.

## Beach widths around the island

Beach width uses the alongshore survey with its own seed, **2308**. Periodic noise at roughly 88, 41, and 18 m varies the width from reach to reach. The authored points narrow it and the indentations widen it. World-space noise in 6.5 m and 2.7 m cells adds smaller breaks where sand meets meadow at walking distance. Those are static terrain rules inspired by the effect of coastal shape and wave exposure on where beach sand collects. [Pocket-beach field study](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00445/full)

Measured inland along the terrain rays, the east cove has about 15 m of sand, the northwest indentation about 12 m, and the shore southeast of the ferry about 11 m. The exposed west shoulder has a strip about 1 m wide, and the sand pinches out near the tip of Windstone Point.

- [Aerial survey](http://localhost:5173/workbench.html#ridge-glider-scout?stage=island). Focus the viewport and press **C** to look down at the coast.
- [East cove](http://localhost:5173/workbench.html?view=1&focus=96,55&target=96,0,55&orbit=0.37,1.38,13,0.70&sky=13,0,8&display=0,0#landscape) · [West shoulder](http://localhost:5173/workbench.html?view=1&focus=-71,-12&target=-71,0,-12&orbit=3.28,1.33,13,0.7&sky=13,0,8&display=0,0#landscape) · [Windstone Point](http://localhost:5173/workbench.html?view=1&focus=92,173.5&target=92,0,173.5&orbit=0.95,1.37,13,0.68&sky=13,0,8&display=0,0#landscape)

## Driftwood dunes and Splitstone

The parasols stand on a broad sandy shelf. Inland of the eastern parasol, sand reaches into a low group of dunes around (39.5, −25.7). Look for narrow blades of marram on the crests and a flock of six sandpipers running and probing on the damp beach below. Sand narrows against the exposed sandstone at Splitstone. The two worn trails fade into sand. Follow the dry landward rim past the Shellglass tide staff and use the southern opening into the Splitstone cleft.

The sandpipers use sanderlings as a reference for their pale body, dark bill and legs, and short foraging runs. Each bird keeps its own space along the wash. Nearby walkers make the birds pause their feeding and give ground along the beach. [Sanderling identification and behavior](https://www.allaboutbirds.org/guide/Sanderling/id/)

The Landscape Workbench runs the same terrain and wildlife as the game. These views share clear 13:00 daylight. Press **Play** in the sandpiper view to watch the run and probe cycle, or place a test crewmate in the dune view and walk over the crest.

- [Coast from above](http://localhost:5173/workbench.html?view=1&focus=40,-28&target=42,0,-28&orbit=-1.50,0.63,50,0.62&sky=13,0,8&display=0,0#landscape)
- [Driftwood's broad shelf](http://localhost:5173/workbench.html?view=1&focus=31,-36&target=31,0,-36&orbit=1.51,1.22,18,0.67&sky=13,0,8&display=0,0#landscape)
- [Marram on the inland dune](http://localhost:5173/workbench.html?view=1&focus=39,-27&target=39,0.53,-27&orbit=-2.12,1.40,9.2,0.63&sky=13,0,8&display=0,0#landscape)
- [Sandpipers below the dunes](http://localhost:5173/workbench.html?view=1&focus=39.8,-36.8&target=39.8,0,-36.8&orbit=1.18,1.31,4.7,0.62&sky=13,0,8&display=0,0#landscape)
- [Splitstone at shore level](http://localhost:5173/workbench.html?view=1&focus=55,-22&target=55,0.42,-22&orbit=-0.77,1.18,12,0.66&sky=13,0,8&display=0,0#landscape)

## Repeat the field check

1. Open the game in Island view and look south toward the harbor curve and north toward the Windstone point. Switch to the follow camera and walk Harbor Depot → fishing dock. Check that the plank approach and boarding work and that the skiff can paddle out and turn back from the buoy limit. Walk the road to the closed ferry terminal as a separate approach.
2. Follow Driftwood Beach → Shellglass → Splitstone. Check the water's edge, the dry route around the sill, and the two discoveries. Use the [harbor view](http://localhost:5173/workbench.html?view=1&focus=-44,-33.5&target=-44,0.1,-33.5&orbit=1.57,1.42,10.4,0.8&sky=13,0,8&display=0,0#landscape) and [Driftwood view](http://localhost:5173/workbench.html?view=1&focus=45.3,-32.8&target=45.3,0.12,-32.8&orbit=-2.95,1.42,9.2,0.8&sky=13,0,8&display=0,0#landscape) for matching shore-level captures at 13:00 in clear daylight.
3. Restart the host and reopen the same views. Record the build, seed, positions, and any difference in shoreline or buoys in the shared [Island silhouette and terrain checklist](https://github.com/brylie/mission-island/issues/52#issue-body).
