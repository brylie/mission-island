// Shared parts for road vehicles. Model origin is on the ground, local +Z is
// forward, +Y up and +X right. A vehicle's own body paint stays with its model.

export type VehiclePart = {
  center: readonly [x: number, y: number, z: number]
  size: readonly [width: number, height: number, depth: number]
}

// A convex side elevation, extruded across the body: [forward, up] pairs.
export type VehicleProfile = readonly (readonly [z: number, y: number])[]

// Fleet trim roles. Every vehicle with a chassis, glass, wheels and lamps uses
// these, so the Harbor Depot flatbed and the Slatecliff ore truck read as kin.
export const fleetPaint = {
  frame: '#344944',
  rubber: '#283933',
  brightTrim: '#a6b2a4',
  bumper: '#71857f',
  tread: '#84948d',
  tank: '#798c82',
  roofCream: '#f1dfb3',
  windshield: '#426976',
  doorGlass: '#557b83',
  headlamp: '#fff4c1',
  indicator: '#d77d3f',
  roofMarker: '#daa051',
  tailRed: '#c45446',
  tailAmber: '#e6a654',
} as const

// The fleet wheel stacks a tire shoulder, rim, hub, cap and lug nuts outboard
// of the tread. Ring diameters are fractions of the tire diameter. Standoffs,
// depths and lug sizes are fractions of the tire radius, measured outward
// from the tire's outer face.
export const fleetWheel = {
  segments: 16,
  rings: {
    shoulder: { standoff: 0.037, outer: 0.88, inner: 1, depth: 0.102 },
    rim: { standoff: 0.093, outer: 0.565, inner: 0.62, depth: 0.065 },
    hub: { standoff: 0.131, outer: 0.426, inner: 0.472, depth: 0.056 },
    cap: { standoff: 0.163, outer: 0.204, inner: 0.269, depth: 0.067 },
  },
  lug: { standoff: 0.169, boltCircle: 0.32, count: 6, size: [0.052, 0.098, 0.104] },
} as const

// Lit lamp colors are emissive and stay with the lamps.
export const fleetLampGlow = {
  head: '#fff3b0',
  tail: '#c83832',
  braking: '#ff7763',
} as const
