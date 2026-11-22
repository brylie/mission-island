import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { coastalProfile } from './coastal-profiles'
import { foxgloveRosette, foxgloveSpike } from './geometry/foxglove'

const seedMultiplier = 2654435761
const piRadiansPerTurn = 2
const half = 0.5
const stemSwayAmplitude = 0.026
const stemSwayFrequency = 1.6

export function createFoxglove(meshes: MeshFactory, seed: number) {
  const random = seededRandom(Math.imul(seed, seedMultiplier))
  const root = new TransformNode('Foxglove rosette', meshes.scene)
  const { leaf: leaves } = foxgloveRosette
  const { stem: spike, bells } = foxgloveSpike
  const tall = spike.height + random() * spike.heightVariation
  const turn = random() * Math.PI * piRadiansPerTurn
  for (let i = 0; i < leaves.count; i++) {
    const leaf = coastalProfile(meshes, root, 'Creased basal leaf', leaves.colors[i % leaves.colors.length], leaves.shape, leaves.segments)
    leaf.rotation.y = turn + i * leaves.spread
    leaf.scaling.scaleInPlace(leaves.minimumScale + leaves.scaleRange * random())
    leaf.rotation.x = leaves.tiltStep * (i % leaves.tiltLevels)
  }
  const stem = new TransformNode('Flower spike', meshes.scene)
  stem.parent = root
  meshes.cylinder(0, tall * half, 0, spike.top, spike.bottom, tall, spike.segments, spike.color, stem)
  for (let i = 0; i < bells.count; i++) {
    const t = i / (bells.count - 1)
    const bell = coastalProfile(meshes, stem, 'Foxglove bell', bells.colors[i % bells.colors.length], bells.shape, bells.segments)
    bell.position.y = tall * (bells.height.start + bells.height.span * t)
    bell.rotation.y = turn + Math.sin(i * bells.yaw.frequency) * bells.yaw.amplitude
    bell.rotation.x = bells.pitch.base - bells.pitch.variation * t
    bell.scaling.scaleInPlace(bells.scale.base - bells.scale.taper * t)
  }
  return { root, sway(time: number) {
    stem.rotation.z = stemSwayAmplitude * Math.sin(time * stemSwayFrequency + turn)
  } }
}
