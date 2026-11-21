// The crew walk cycle shared by the leg pose and footstep sounds. A foot lands at each half cycle,
// where the leg swing crosses zero, so footsteps always match the visible gait.

export const metresPerCycle = 4.8
// A rendered jump larger than this is a snap to a new pose, not walking.
const maxStepMetres = 2

type Planar = { x: number; z: number }

// Movement over the ground, ignoring what a carrier such as the truck bed moved underneath.
export function groundTravel(from: Planar, to: Planar, carrier: Planar = { x: 0, z: 0 }) {
  const travelled = Math.hypot(to.x - from.x - carrier.x, to.z - from.z - carrier.z)
  return travelled < maxStepMetres ? travelled : 0
}

export function advanceGait(cycle: number, travelled: number) {
  const next = cycle + Math.max(0, travelled) / metresPerCycle
  return { cycle: next, footfalls: Math.floor(next * 2) - Math.floor(cycle * 2) }
}
