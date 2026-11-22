// Places where a wildfire can start, with the ground it can spread across. Each hotspot offset is
// [x, z] in metres from the site. A fire of a given size uses the first few; the wind decides the
// order they catch in.
export const starterFireSites = [
  { id: 'pinewoods-glade', name: 'Pinewoods glade', x: -30.5, z: 26.5, hotspots: [[0, 0], [2.2, 1.4], [-2, 1.8], [1.1, -2.3], [-2.8, -1.1]] },
  { id: 'juniper-scrub', name: 'Juniper Hollow scrub', x: -65, z: 80, hotspots: [[0, 0], [-2.1, 1.2], [2, 1.6], [0.6, -2.4], [-1.6, -2.2]] },
  { id: 'meadow-slope', name: 'Windstone meadow slope', x: -18, z: 34, hotspots: [[0, 0], [2.4, 0.8], [-1.8, 2], [1.4, -2.1], [-2.6, -0.9]] },
  { id: 'lookout-ridge', name: 'Lookout ridge grass', x: 2.5, z: 44, hotspots: [[0, 0], [-2.2, 1.1], [2.1, 1.7], [-0.9, -2.3], [2.6, -1.2]] },
  { id: 'farm-hedge', name: 'Long Acre hedgerow', x: 20.5, z: -17.5, hotspots: [[0, 0], [2.3, -0.6], [-2.2, 0.9], [0.8, 2.2], [-1.5, -2.2]] },
  { id: 'shore-meadow', name: 'Driftwood shore meadow', x: 15.5, z: -36, hotspots: [[0, 0], [2.4, 0.6], [-2.3, 0.4], [0.9, 1.9], [-1.2, 1.8]] },
] as const
