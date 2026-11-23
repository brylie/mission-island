# Glossary

Terms used in the field guide, design docs and code. Each says what the word means in the real world. Where the game uses it differently or more narrowly, the entry says so.

| Term | Meaning |
| --- | --- |
| **Canopy** | The upper layer of a wood, formed by tree crowns. |
| **Carr** | Wet woodland on waterlogged ground, usually alder or willow. |
| **Catkin** | A slim, hanging cluster of tiny flowers, as on birch, alder and willow. Many catkins spread their pollen on the wind. |
| **Clonal stand** | A group of stems that grew from one plant's roots, so they share the same genes, as in aspen. |
| **Crown** | The branches and foliage of a tree above its trunk. In the code, a template's foliage mesh is its `crown`. |
| **Crozier** | A young fern frond still curled like a shepherd's crook, also called a fiddlehead. |
| **Deadfall** | A fallen dead tree or limb lying on the ground. |
| **Dioecious** | Having male and female flowers on separate plants, as in juniper, willow and aspen. |
| **Duff, needle litter** | The layer of fallen needles, leaves and twigs on a forest floor, slowly rotting into soil. *Duff* often means the lower, partly rotted part. In the game, Highwood's ground shows needle litter under pine with the `pine-duff` texture. |
| **Exposure** | How much a site is open to the wind. The game has two levels, sheltered and exposed, and [#213](https://github.com/brylie/mission-island/issues/213) proposes a gradient. |
| **Granny pine** | A Scottish name for a very old Scots pine, often broad-crowned with heavy limbs. |
| **Heath** | Open ground of heather and other low shrubs on poor, acid soil. |
| **Leader** | The main upward-growing shoot at the top of a tree. |
| **Lee, leeward** | The side sheltered from the wind. In the game, exposed forms stream toward +x, their lee side. |
| **Lenticel** | A small breathing pore in bark, often seen as dark marks or dashes on birch and aspen. |
| **Nitrogen fixation** | Turning nitrogen from the air into a form plants can use. Alder does it with the help of bacteria in its root nodules. |
| **Phenology** | The timing of seasonal events in nature, such as flowering, fruiting, leaf fall and bird migration. |
| **Pinnate** | A leaf made of many leaflets on either side of a central stalk, as in rowan and bracken. |
| **Pioneer species** | A plant that colonises open or disturbed ground first, such as birch. |
| **Regeneration** | New trees growing up in a wood, usually from seed. Natural regeneration needs seed, light and freedom from heavy grazing. In the game, young pines and saplings are placed at edges and in gaps. |
| **Rhizome** | An underground stem that spreads sideways and sends up new shoots, as in bracken. |
| **Root plate** | The flat disc of roots and soil torn out of the ground when a tree is blown over. |
| **Self-pruning** | The natural loss of shaded lower branches as a tree grows taller in a stand. |
| **Snag** | A standing dead tree. |
| **Sucker** | A shoot that grows up from a tree's roots, as in aspen. |
| **Succession** | The gradual change in plants and animals at a place over time, for example open ground to birch, then pine. |
| **Understory** | The plants growing beneath the canopy, from shrubs and young trees down to the ground layer. |
| **Whorl** | Several branches or leaves growing from one point around a stem, as in a young Scots pine's tiers of branches. |
| **Wind flagging** | A tree shape where branches grow mainly on the downwind side because wind damages shoots on the windward side. |
| **Windthrow** | Trees blown over by wind, roots and all. |
| **Windward** | The side facing into the wind. |

## Game and development terms

| Term | Meaning |
| --- | --- |
| **Broadphase** | The cheap first pass of collision detection. It rules out body pairs too far apart to touch, so the costly exact test (the narrowphase) runs on few pairs. |
| **Draw call** | One request from the main processor to the graphics card to draw a mesh with its material. Each carries overhead, so a forest is cheaper in a few big batches than in many small ones. |
| **Far tier, near tier** | Two detail levels of the same tree. The near model has more triangles and shows close up; the far model keeps the silhouette with few triangles. In Highwood, a 64 m tile switches to the far tier about 80 metres from the camera. |
| **Frustum culling** | Skipping anything outside the camera's view, the *frustum*, before drawing it. Highwood culls each far tile whole. |
| **Level of detail (LOD)** | Drawing a simpler model of an object when it is far away and small on screen. The switch between models is an LOD switch. |
| **Narrowphase** | The exact collision test on the pairs the broadphase kept. It finds contact points and can wake a sleeping body. |
| **Seed** | A whole number that picks one plant's variation. The same species, age, exposure and seed always grows the same plant. |
| **Silhouette view** | A Workbench look that draws every plant as a flat black shape, to check each species can be recognised by outline alone. |
| **Sleeping body** | A body the physics engine has stopped simulating until something wakes it, such as a parked vehicle. |
| **Static body** | A physics body that never moves, such as a tree trunk or rock. It can only collide with moving bodies. |
| **Template** | One baked species, age, exposure and seed, built once and drawn many times with thin instances. |
| **Thin instance** | A cheap copy of a mesh placed with only a position, rotation and scale, so thousands of trees cost about as much as one draw per material. |
