export const barrowWalk = { loadedSpeed: 1.6, emptySpeed: 1.85, cycleMetres: 1.3 }

const stance = .52
const shoeReach = .66
const halfStroke = barrowWalk.cycleMetres * stance / 2

export function barrowLegPose(cycle: number, leg: number, strength: number) {
  const phase = (cycle + leg / 2) % 1
  const swing = Math.max(0, (phase - stance) / (1 - stance))
  const eased = swing * swing * (3 - 2 * swing)
  const shoeZ = halfStroke * (phase < stance ? 1 - 2 * phase / stance : 2 * eased - 1)
  const knee = .64 * strength * Math.sin(Math.PI * swing) ** 2
  return { hip: -Math.asin(shoeZ * strength / shoeReach) - .52 * knee, knee }
}
