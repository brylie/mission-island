import { island, type Point } from '../../../world.ts'
import { highwoodGeneration } from '../layout/island-generation.ts'

const halves = 2
const degreesPerTurn = 360
const halfTurn = 180
const smoothstepQuadratic = 3
const smoothstepCubic = 2

function smooth(t: number) {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (smoothstepQuadratic - smoothstepCubic * u)
}

// The original island's coast bearing for a point, in degrees from east.
function originalBearing({ x, z }: Point) {
  const degrees = Math.atan2(z / (island.length / halves), x / (island.width / halves)) * halfTurn / Math.PI
  return (degrees + degreesPerTurn) % degreesPerTurn
}

// How much of the join sector a bearing is in, from 0 outside to 1 inside.
export function joinShare(bearing: number) {
  const { fromBearing, toBearing, fade } = highwoodGeneration.join
  return smooth((bearing - fromBearing + fade) / fade) * smooth((toBearing - bearing + fade) / fade)
}

// How much a point keeps the authored island: 1 on protected ground, 0 where
// the generated land takes over. `originalRadius` is the point's radius against
// the original coast, as `coastRadius` measured it before Highwood.
export function authoredShare(point: Point, originalRadius: number) {
  const { innerRadius, outerRadius } = highwoodGeneration.join
  return 1 - joinShare(originalBearing(point)) * smooth((originalRadius - innerRadius) / (outerRadius - innerRadius))
}
