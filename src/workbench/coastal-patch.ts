import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createFoxglove } from '../assets/foxglove'
import { createOystercatcher } from '../assets/oystercatcher'
import { coastalFlowerPatch, coastalForagers } from '../assets/recipes/workbench-coastal-patch'
import { seededRandom } from '../seeded-random'
import type { BiomeRecipe } from '../biome-recipe'
import type { Point } from '../world'

const minimumMergeParts = 2
const halves = 2

// Batch only pieces with a common pivot and material. The spike can still sway independently.
function batchFlowers(meshes: MeshFactory, root: TransformNode) {
  for (const pivot of [root, ...root.getChildTransformNodes(true)]) {
    const parts = pivot.getChildMeshes(true).filter((m): m is Mesh => m instanceof Mesh)
    for (const material of new Set(parts.map((m) => m.material))) {
      const group = parts.filter((m) => m.material === material)
      if (group.length < minimumMergeParts) continue
      const merged = Mesh.MergeMeshes(group, false)
      if (!merged) continue
      for (const part of group) {
        meshes.shadows.removeShadowCaster(part, false)
        part.dispose()
      }
      merged.parent = pivot
      merged.name = 'Batched foxglove ' + pivot.name
      meshes.shadows.addShadowCaster(merged, false)
    }
  }
}

export function createCoastalPatch(meshes: MeshFactory, recipe: BiomeRecipe) {
  const patch = coastalFlowerPatch
  const { seedOffset, home: habitat, separation: spacing, roaming, limits, walker: visitor, gait } = coastalForagers
  const flowers = seededRandom(recipe.seed + patch.seedOffset)
  const plants = Array.from({ length: recipe.foxgloves }, (_, i) => {
    const plant = createFoxglove(meshes, recipe.seed * patch.seedStride + i)
    batchFlowers(meshes, plant.root)
    const theta = flowers() * Math.PI * halves, r = Math.sqrt(flowers()) * patch.radius
    plant.root.position.set((i % halves ? -patch.sideOffset : patch.sideOffset) + Math.cos(theta) * r, 0, Math.sin(theta) * r + patch.z + i % halves * patch.rowSpacing)
    return plant
  })
  const random = seededRandom(recipe.seed + seedOffset)
  const flock = Array.from({ length: recipe.oystercatchers }, () => {
    const bird = createOystercatcher(meshes)
    const theta = random() * Math.PI * halves, r = Math.sqrt(random()) * habitat.radius
    const home = { x: Math.cos(theta) * r, z: habitat.z + Math.sin(theta) * r }
    bird.root.position.set(home.x, 0, home.z)
    const phase = random() * habitat.phaseRange
    bird.root.rotation.y = phase
    return { ...bird, home, phase, stride: 0 }
  })
  // Leave a bill-length gap when two foragers reach for the same spot.
  function keepSpace(position: Point) {
    let x = 0, z = 0, crowded = false
    for (const other of flock) {
      const sx = position.x - other.root.position.x, sz = position.z - other.root.position.z
      const apart = Math.hypot(sx, sz)
      if (apart > spacing.range || apart < spacing.minimumDistance) continue
      const push = (spacing.range - apart) / apart * spacing.gain
      x += sx * push
      z += sz * push
      crowded = true
    }
    return { x, z, crowded }
  }
  let lastTime = 0
  return (time: number, walker?: Point) => {
    for (const plant of plants) plant.sway(time)
    const elapsed = time - lastTime
    lastTime = time
    const dt = Math.min(limits.maxStepSeconds, Math.max(0, elapsed))
    let alert = 0
    for (const bird of flock) {
      const { position, rotation } = bird.root
      const angle = time * roaming.turnRate + bird.phase
      const x = bird.home.x + roaming.xDrift * Math.sin(time * roaming.xDriftRate) + roaming.xOrbit * Math.cos(angle)
      const z = bird.home.z + roaming.zDrift * Math.cos(time * roaming.zDriftRate) + roaming.zOrbit * Math.sin(angle)
      if (elapsed < 0 || elapsed > limits.seekGapSeconds) position.set(x, 0, z)
      const dx = position.x - (walker?.x ?? visitor.offstage), dz = position.z - (walker?.z ?? visitor.offstage)
      const distance = Math.hypot(dx, dz)
      const wary = distance < visitor.alertRange
      if (wary) alert++
      let vx = wary ? dx / (distance || 1) : x - position.x
      let vz = wary ? dz / (distance || 1) : z - position.z
      const separation = keepSpace(position)
      vx += separation.x
      vz += separation.z
      const gap = Math.hypot(vx, vz)
      const stepping = separation.crowded || wary || (gap > gait.minimumGap && Math.sin(time + bird.phase) > gait.stepThreshold)
      if (stepping && dt > 0) {
        const target = Math.atan2(vx, vz)
        const turn = Math.atan2(Math.sin(target - rotation.y), Math.cos(target - rotation.y))
        rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * gait.turnSpeed)
        const step = dt * (wary ? gait.fleeSpeed : gait.walkSpeed) * Math.max(0, Math.cos(turn))
        position.x += step * Math.sin(rotation.y)
        position.z += step * Math.cos(rotation.y)
        const radius = Math.hypot(position.x, position.z)
        if (radius > limits.stageRadius) position.scaleInPlace(limits.stageRadius / radius)
        bird.stride += step * gait.phasePerMetre
      }
      bird.pose(stepping ? bird.stride : time + bird.phase, !stepping, stepping ? 1 : 0)
    }
    return alert
  }
}
