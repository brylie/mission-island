export const juniperFern = { name: 'Juniper fern fans', height: 0.53, bend: 0.5, color: '#72925d', seed: 1632 } as const
export const understoryBladeCount = 5
export const understoryGroundOffset = -0.025

export function sampleUnderstoryBlade({ height: maxHeight, bend: maxBend }: { height: number, bend: number }, { x: px, y, z: pz }: { x: number, y: number, z: number }, angle: number, leaf: number, scale: number, random: () => number) {
  const theta = angle + leaf * 2.34 + random() * 0.26
  const height = maxHeight * scale * (0.7 + random() * 0.4)
  const bend = maxBend * scale * (0.6 + random() * 0.6)
  const x = Math.cos(theta) * bend, z = Math.sin(theta) * bend
  const wide = 0.03 + bend * 0.1
  const wx = Math.sin(theta) * wide, wz = -Math.cos(theta) * wide
  const root = [px + x * 0.07, y, pz + z * 0.07]
  const left = [px + x * 0.42 - wx, y + height * 0.63, pz + z * 0.42 - wz]
  const right = [px + x * 0.42 + wx, y + height * 0.63, pz + z * 0.42 + wz]
  const tip = [px + x, y + height, pz + z]
  return { positions: [...root, ...left, ...right, ...left, ...tip, ...right], tip }
}
