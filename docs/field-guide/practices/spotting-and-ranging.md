# Spotting and ranging

**Type: explanation (practice). Real world: draft, sourced, not yet checked by a person. On the island: playable**, see [binoculars and crew marks](../../mechanics/fire-watch.md#binoculars-and-crew-marks). Last tended 2026-11-23. Model purpose: **illustrate** how a spotter finds, measures and reports a distant point. The game doesn't simulate optics or lasers.

Spotting means finding something far away, working out where it is and telling other people clearly enough that they can reach it. Fire lookouts do it for a living. Walkers, birdwatchers, foresters, surveyors and search teams use the same kit: binoculars to see, a rangefinder or a map to measure distance, and a compass to give direction. This page explains how each tool works and how lookouts put them together. The [wildfire](../processes/wildfire.md) page covers the fire itself and the lookout's fire finder.

Source ids in brackets, like (`nikon-binocular-numbers`), point to entries in the [sources register](../../sources.yaml). Each entry has a short quote from the page it came from.

## What the job is

A fire lookout watches the land from a tower or a hilltop and reports any smoke. The US National Wildfire Coordinating Group (NWCG) describes the job as the "detection and reporting of fires from a lookout station". A lookout uses a fire finder to locate the smoke against landmarks, estimates how far away it is and how big it is, and reports "azimuth, distance, location, volume, color, behavior of smoke" by radio or telephone (`nwcg-fire-lookout-position`). A lookout in Montana describes keeping a map, a radio, binoculars and an Osborne fire finder at hand during a fire, and radioing dispatch (`american-forests-haugen-lookout`).

The report has to work for someone who can't see what the lookout sees, so it gives a direction from a known point and a distance. The rest of this page covers the tools behind those two numbers. Lookout sources here are from the United States. Practice in other countries may differ.

## Skills and kit

### Binoculars

Binoculars carry two numbers, such as **8×42**:
- **8×** is the magnification. In an 8×42 binocular, "the image is magnified eight times" (`nikon-binocular-numbers`). Something 800 m away looks about as big as it would from 100 m.
- **42** is the diameter of each [objective lens](../glossary.md), the big front lens, in millimetres (`nikon-binocular-numbers`). A bigger objective collects more light but adds weight. That is still unsourced.

**Exit pupil.** Hold binoculars at arm's length and you see a small bright disc in each eyepiece. That disc is the [exit pupil](../glossary.md). Its width is the objective diameter divided by the magnification (`nikon-exit-pupil`). For 8×42 that is 42 ÷ 8 = 5.25 mm, which Nikon lists as 5.3 mm (`nikon-monarch-m5-8x42`). A wider exit pupil gives a brighter view in poor light, because it fills more of a widened eye pupil. That last point is still unsourced.

**Field of view.** The real field of view is the angle of scene you see without moving the binoculars. Makers give it in degrees, or as the width of the view at a set distance, such as metres at 1,000 m or feet at 1,000 yards (`nikon-binocular-numbers`, `nikon-field-of-view`). Two examples:
- Nikon's worked example, for an 8×42 with a 7.0° field: it covers 2 × 1,000 m × tan(3.5°) = 122 m at 1,000 m (`nikon-field-of-view`).
- One 8×42 roof-prism binocular, the Nikon Monarch M5, lists a real field of 6.4°, or 335 ft at 1,000 yards (`nikon-monarch-m5-8x42`).

Higher magnification gives a narrower field, so a moving bird or a small smoke is harder to find. That is still unsourced.

**Shake.** Binoculars magnify the movement of your hands as much as the view: "higher levels of magnification are also more prone to the shakiness of your hands" (`nikon-binocular-numbers`). Bracing your elbows, or resting the binoculars on a rail, steadies the view. That advice is still unsourced.

**Prisms.** A lens on its own makes an upside-down image. Prism binoculars use glass prisms "to rectify an inverted image projected by the objective" (`nikon-prisms`). There are two main designs:
- **Roof (Dach) prisms** keep the light path straight, giving slim, straight barrels.
- **Porro prisms** bend the path "like the letter Z", so the binoculars are wider and larger (`nikon-prisms`).

**What binoculars can't do.** Binoculars magnify the light that reaches them. They can't undo what the air does to it on the way. Over long distances, warm, moving air acts as "a weak lens that interferes with the light from a distant object", and more magnification makes the blur worse (`celestron-atmosphere-blur`). That source is about air shimmer. That haze, smoke and rain scatter light and wash out a distant view is still unsourced.

### Laser rangefinders

A laser rangefinder fires a short pulse of light at a target and times the reflection. Light travels out and back, so the distance is half the round trip: **distance = speed of light × time ÷ 2** (`rp-photonics-laser-rangefinders`, `wikipedia-laser-rangefinder`). Scientists use the same idea at a much larger scale: they fire laser pulses at reflectors left on the Moon and measure "the round-trip travel time" (`nasa-lunar-laser-ranging`). Not every rangefinder times a single pulse. Some send a continuously modulated beam and measure its phase shift, and RP Photonics says most handheld units for moderate distances work that way (`rp-photonics-laser-rangefinders`).

**Range and accuracy.** Two of Nikon's handheld rangefinders show what to expect:
- The Forestry Pro II ranges 7.5–1,600 m, to ±0.3 m under 1,000 m and ±1.0 m beyond (`nikon-forestry-pro-ii`).
- The LASER 30 ranges 7.3–1,460 m, to ±0.5 m under 700 m, ±1.0 m from 700 to 1,000 m, and ±1.5 m beyond (`nikon-laser-30`).

Both have a minimum range of about 7 m, and both read in 0.1 m steps. Nikon warns that the specifications may not be met "depending on the target object's shape, surface texture and nature, and/or weather conditions" (`nikon-laser-30`). Humidity, snow and dust scatter the signal (`wikipedia-laser-rangefinder`).

**Line of sight or horizontal distance.** The basic reading is the straight-line distance along the beam. Looking up or down a slope, that is longer than the distance across the map. Many rangefinders also work out the horizontal distance from the angle of the beam:
- Vortex calls the two readings "Line of Sight" and slope-angle compensated distance (`vortex-rangefinder-modes`).
- Nikon's units show actual distance, horizontal distance, height and angle (`nikon-forestry-pro-ii`, `nikon-laser-30`).

**Which echo.** Some of the beam can hit leaves or branches in front of the target (`wikipedia-laser-rangefinder`). RP Photonics notes spurious echoes from things such as leaves blowing through the beam (`rp-photonics-laser-rangefinders`). The same effect is useful for measuring forests from space: NASA's GEDI lidar records the laser energy "reflected by plant material" at each height above the ground (`nasa-gedi-first-data`). Rangefinders let the user choose which return to show:
- **Closest:** Nikon's First Target Priority and Vortex's First Mode show the nearest return, for a tree in front of a forest background.
- **Farthest:** Distant Target Priority and Last Mode show the farthest return, for a target behind brush or branches.
- **Strongest:** Vortex's default Normal Mode shows the strongest return (`nikon-forestry-pro-ii`, `vortex-rangefinder-modes`).

A reading through leaves can be the leaves, not the deer or smoke behind them.

**Eye safety.** Consumer rangefinders are made to a low laser hazard class. Both Nikon units are labelled IEC 60825-1 Class 1M and FDA Class I (`nikon-forestry-pro-ii`, `nikon-laser-30`). The US Food and Drug Administration describes Class I as "considered non-hazardous", and adds that the hazard increases if the beam is viewed through optical aids such as binoculars (`fda-laser-classes`).

### Compass bearings

A **bearing**, or **azimuth**, is a direction measured in degrees clockwise from north, from 0° to 360°:
- north is 0° or 360°;
- east is 90°;
- south is 180°;
- west is 270° (`nwcg-firefighter-math-location`, `os-using-a-compass`).

NWCG adds that "in wildland fire service, the azimuth is always read from the north point". Directions are also given as the **eight compass points**: north, north-east, east, south-east, south, south-west, west and north-west. NWCG notes that wind direction is traditionally reported as one of these eight points (`nwcg-firefighter-math-location`). A **back azimuth** points the other way. It is the bearing plus or minus 180°, so the back azimuth of 320° is 140° (`nwcg-firefighter-math-location`).

**Which north?** There are three:
- **True north** is the direction of the geographic North Pole.
- **Grid north** is the direction the map's grid lines point.
- **Magnetic north** is where a compass needle points (`os-three-norths`).

The angle between magnetic north and true north is the **[declination](../glossary.md)**, also called magnetic variation. It "changes over time, and with location" (`noaa-magnetic-declination`). Because the magnetic pole moves, the grid–magnetic angle printed on a map is correct only for the year it was printed (`os-three-norths`). To turn a magnetic bearing into a true bearing, add the declination, counting east as positive (`noaa-magnetic-declination`). NWCG's lookout example starts with this step: "Adjust for declination" (`nwcg-firefighter-math-location`).

## What goes wrong

- **Shake and a narrow view.** At 8× or more, a hand-held view jitters, and a small smoke is easy to lose.
- **The wrong echo.** A rangefinder in a wood can read a nearby branch instead of the target. It can also fail to return any reading from a dark, angled or distant surface.
- **Slope.** A line-of-sight distance used as a map distance places a point too far away when looking up or down a slope.
- **The wrong north.** A compass bearing plotted on a map without allowing for declination puts the point off to one side. The error grows with distance: at 10 km, each degree is about 175 m sideways. That figure is simple trigonometry, not a sourced claim.
- **One bearing isn't a position.** A bearing gives a line. A distance estimate from one tower is rough. See the next section.

## How it's organised

Lookouts report to a dispatch or emergency communications centre, usually by radio (`nwcg-fire-lookout-position`, `american-forests-haugen-lookout`). A US Forest Service note describes one volunteer's routine with the Osborne fire finder:
1. Sight along the instrument to the base of the smoke.
2. Read the horizontal angle in degrees and minutes.
3. Read the vertical angle.
4. Estimate the miles to the smoke with the finder's metal tape and the map fixed to it (`usfs-osborne-firefinder`).

To pin down a fire precisely, a second lookout takes a bearing on the same smoke. NWCG calls this **intersection**: "the object or fire is located where the individual lines cross", and a third or fourth reading helps further. In NWCG's example, one tower radios its azimuth to a second tower and receives that tower's azimuth in return (`nwcg-firefighter-math-location`). The [wildfire page](../processes/wildfire.md#fighting-a-fire) holds the fire-finder side of this.

Lookout work is a recognised position with a written duty statement, and lookouts also record weather and keep logs (`nwcg-fire-lookout-position`). Training and staffing vary by agency and country. That part is still unsourced.

## In the game

See [binoculars and crew marks](../../mechanics/fire-watch.md#binoculars-and-crew-marks) for the exact rules and numbers.

- **Binoculars.** Every crewmate can raise 8× binoculars, modelled on an 8×42, on foot. The view narrows by the magnification, to roughly a 7° tall field, close to the real field of a hand-held 8×.
- **Rangefinder.** A reticle in the centre reads the straight-line distance and a compass bearing to whatever it points at, out to 800 m, such as `84 m · 267° west`. Past that, or at the sky, it shows a dash.
- **Bearings.** The bearing is in whole degrees clockwise from the island's north, with one of the eight compass points.
- **Marks.** A click marks the ranged spot for the whole crew with a beacon and a map pin, one mark per crewmate. Others read the mark's distance and direction from where they stand.
- **Fires.** A mark close to a burning hotspot locates a wildfire, as the fire finder in the Fire Watch tower does.

## Where the island differs

| Real | On the island | Why we simplified | What a player might wrongly learn |
| --- | --- | --- | --- |
| Binoculars magnify what reaches them; distance, air shimmer and haze still blur a far view. | While the binoculars are up, fog is pushed twice as far away. | Far ground stays readable at the island's scale. | That binoculars see through haze, fog or smoke. |
| A rangefinder's beam can return from leaves, branches or rain in front of the target, and the user picks the closest, farthest or strongest echo. | The beam ignores trees, crew and vehicles, and treats each house and the Fire Watch cab as a box up to its ridge. | A clean reading on the ground, the thing crews mark. Tree trunks and crowns aren't shaped for ray tests. | That a rangefinder reads straight through foliage. |
| A compass points to magnetic north, which differs from true and grid north by the declination. | The bearing is measured from the island's single north, which is true, grid and compass north at once, with no declination. | One north is easier to learn first. See [conventions](../../conventions.md#space). | That a compass bearing can go straight onto a map. |
| The objective lens's size sets how bright the view is at dawn and dusk. | Light gathering isn't modelled. At night the view is as dark as the naked eye. | No exposure simulation. | That 42 mm and 25 mm binoculars are alike in the dark. |
| Hand-held views shake, more so at higher magnification. | The view is perfectly steady. | Shake on a screen is tiring and hard to aim with a mouse. | That 8× is easy to hold steady. Bracing still helps in real life. |
| Handheld rangefinders have a minimum range of about 7 m and read to 0.1 m, with an accuracy of about ±0.3 to ±1.5 m. | The readout is in whole metres, at any range from 0 to 800 m, and always exact. | A short number is easy to call out to a crewmate. | That a reading is exact, and that it works at arm's length. |

**Real patterns the model misses:**
- the slope correction from line of sight to horizontal distance (the readout is line of sight only);
- the eye safety of the laser;
- estimating distance without a rangefinder, as lookouts do with a map and terrain;
- crossing bearings from two towers. One mark gives an exact position, so the game doesn't teach [intersection](../processes/wildfire.md#where-the-island-differs).

## Notice this

From the Fire Watch deck, range the same hilltop with the binoculars and then walk to it. Does the walk feel longer than the reading? A line-of-sight distance is straight through the air, but your path climbs and winds.

## Sources

All in the [sources register](../../sources.yaml). Quotes marked `quote-via: fetcher` came through a summarising tool and need a person to check them against the page.

- **Binoculars:** `nikon-binocular-numbers`, `nikon-exit-pupil`, `nikon-field-of-view`, `nikon-prisms`, `nikon-monarch-m5-8x42` (Nikon, tier 2); `celestron-atmosphere-blur` (Celestron, tier 2).
- **Rangefinders:** `nikon-forestry-pro-ii`, `nikon-laser-30`, `vortex-rangefinder-modes` (makers, tier 2); `fda-laser-classes` (US FDA, tier 1); `nasa-lunar-laser-ranging`, `nasa-gedi-first-data` (NASA, tier 1); `rp-photonics-laser-rangefinders` (RP Photonics encyclopedia, tier 3); `wikipedia-laser-rangefinder` (tier 4).
- **Bearings:** `nwcg-firefighter-math-location` (NWCG, tier 1); `noaa-magnetic-declination` (NOAA, tier 1); `os-three-norths`, `os-using-a-compass` (Ordnance Survey, tier 1).
- **Lookouts:** `nwcg-fire-lookout-position` (NWCG, tier 1); `usfs-osborne-firefinder` (US Forest Service, tier 1); `american-forests-haugen-lookout` (American Forests, tier 3).

**Unsourced, to add before this page leaves draft:**
- that a bigger objective and a wider exit pupil give a brighter view in poor light, because the exit pupil fills more of a widened eye pupil;
- that higher magnification narrows the field of view, and that bracing steadies binoculars;
- that haze, smoke and rain scatter light and wash out a distant view;
- how lookouts are trained and staffed;
- **safety review pending:** never look at the sun through binoculars, and never aim a rangefinder at someone's eyes. This needs a current eye-health or laser-safety guideline from a recognised body and a human reviewer before it becomes a safety box.
