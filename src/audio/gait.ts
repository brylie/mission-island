// Footsteps read the same walk cycle that poses the legs (walkGait in island-render-pose).
// A foot lands at each half cycle, where the leg swing crosses zero.

// A rendered jump larger than this is a snap to a new pose, not walking.
const maxStepMetres = 2

type Planar = { x: number; z: number }

// What the truck moved underneath a crewmate riding its bed or roof this frame.
export function carrierShift(player: { onBed: boolean; truckSurface?: string }, truck: Planar) {
  return player.onBed || player.truckSurface ? truck : undefined
}

// Movement over the ground, ignoring what a carrier such as the truck bed moved underneath.
export function groundTravel(from: Planar, to: Planar, carrier: Planar = { x: 0, z: 0 }) {
  const travelled = Math.hypot(to.x - from.x - carrier.x, to.z - from.z - carrier.z)
  return travelled < maxStepMetres ? travelled : 0
}

// Feet that landed while the walk cycle advanced from one phase to the next.
export function countFootfalls(previous: number, next: number) {
  return Math.max(0, Math.floor(next * 2) - Math.floor(previous * 2))
}
