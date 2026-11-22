// Staging for the Workbench dye lineup: two crewmates walking away across open
// grass under the island hour.

export const dyeLineup = {
  // Open grass between the village and the pines, with room to walk north.
  meadow: { x: -30, z: 0 },
  // Each crewmate stands this far either side of the centre line, in metres.
  sideOffset: 0.55,
  // How far the pair walks before the loop restarts, in metres.
  walkAway: 7,
  // Behind the pair, looking north across the grass.
  cameraAngle: -Math.PI / 2,
  headroom: 1.6,
  hour: { start: 17.5, min: 5, max: 21, step: 0.25 },
  minutesPerHour: 60,
  clockDigits: 2,
} as const
