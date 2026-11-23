const jobHighlight = '#acf3da'
const locationRadius = 3.5

export const starterMapLook = {
  margin: 14,
  regionSpread: 0.55,
  water: '#245e68',
  // Land is painted from the ground: sand along the shore, grass inland, shading
  // toward `high` up to `reliefMetres` so ridges read like a chart.
  land: { sand: '#acc293', grass: '#6f9667', high: '#a5a07c', reliefMetres: 45 },
  boundary: { color: '#9abfc1', lineWidth: 1, buoy: { color: '#ffd37b', radius: 2 } },
  discovery: { color: '#e4ffe0', radius: 2.25 },
  paths: {
    desire: { width: 0.85, color: '#b5a77e' },
    gravel: { width: 2, color: '#a5a77e' },
    pavement: { width: 2, color: '#c4c9c1' },
    road: { width: 4, color: '#c7bb9a' },
    // Graded dirt roads, such as Highwood's fire road.
    dirt: { width: 3, color: '#b39a73' },
  },
  fire: { color: '#f7a17d', radius: 6 },
  // A located wildfire: a pale ring around the fire dot, so it does not rely on colour alone.
  wildfire: { color: '#f7a17d', radius: 5, ring: '#fff3d0', ringRadius: 8, ringWidth: 2 },
  north: { text: 'N', color: '#fff3d0', font: '700 11px system-ui, sans-serif', inset: 10 },
  delivery: { color: jobHighlight, radius: 5 },
  harbor: { color: '#fff0ae', radius: 5 },
  market: { color: '#f2d3bc', radius: locationRadius, activeColor: jobHighlight, activeRadius: 6 },
  jobBoard: { color: '#ffd379', radius: 5.5 },
  supplies: { color: '#efac5b', radius: 5.5 },
  truck: { color: '#38433a', width: 10, height: 8 },
  // Learner vehicles draw in their body paint, smaller than the flatbed.
  learners: { pickup: '#c64f41', tractor: '#5b8c45', width: 11, height: 9, letters: { pickup: 'P', tractor: 'T' }, letterColor: '#fff6e4', font: 'bold 8px sans-serif' },
  // A hollow ring with a dot, unlike the solid job and chest dots.
  practiceStop: { color: '#ffd27a', outline: '#3b2f1c', radius: 7, lineWidth: 2.5, dot: 2 },
  skiff: { color: '#fff0ca', radius: locationRadius },
  farm: { color: '#e3ba77', radius: locationRadius },
  ferry: { color: '#d7a07d', radius: locationRadius },
  chest: { color: '#fed487', radius: 3 },
  player: { border: '#234244', radius: 6.5, fillRadius: 4.5 },
  // A crewmate's binocular mark: a diamond pin in their crew tag colour with a dark edge and a pale centre,
  // drawn over the crew dots so it reads apart from them.
  crewMark: { size: 7, outline: '#14201f', lineWidth: 2, centre: '#fff4d8', centreRadius: 1.6 },
} as const
