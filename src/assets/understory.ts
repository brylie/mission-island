import { understoryBladeGeometry } from './geometry/understory'

export { juniperFern } from './geometry/understory'

export const understoryBladeCount = 5
export const understoryGroundOffset = -0.025

export function sampleUnderstoryBlade({ height: maxHeight, bend: maxBend }: { height: number, bend: number }, { x: px, y, z: pz }: { x: number, y: number, z: number }, angle: number, leaf: number, scale: number, random: () => number) {
  const { angleJitter, bendScale, halfWidth, heightScale, leafAngleStep, rootReach, shoulder } = understoryBladeGeometry
  const theta = angle + leaf * leafAngleStep + random() * angleJitter
  const height = maxHeight * scale * (heightScale.base + random() * heightScale.spread)
  const bend = maxBend * scale * (bendScale.base + random() * bendScale.spread)
  const x = Math.cos(theta) * bend, z = Math.sin(theta) * bend
  const wide = halfWidth.base + bend * halfWidth.bendRatio
  const wx = Math.sin(theta) * wide, wz = -Math.cos(theta) * wide
  const root = [px + x * rootReach, y, pz + z * rootReach]
  const left = [px + x * shoulder.reach - wx, y + height * shoulder.height, pz + z * shoulder.reach - wz]
  const right = [px + x * shoulder.reach + wx, y + height * shoulder.height, pz + z * shoulder.reach + wz]
  const tip = [px + x, y + height, pz + z]
  return { positions: [...root, ...left, ...right, ...left, ...tip, ...right], tip }
}
