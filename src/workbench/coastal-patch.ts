import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createFoxglove } from '../assets/foxglove'
import { createOystercatcher } from '../assets/oystercatcher'
import { seededRandom } from '../seeded-random'
import type { BiomeRecipe } from '../biome-recipe'
import type { Point } from '../world'

// Batch only pieces with a common pivot and material. The spike can still sway independently.
function batchFlowers(meshes: MeshFactory, root: TransformNode) {
  for (const pivot of [root, ...root.getChildTransformNodes(true)]) {
    const parts = pivot.getChildMeshes(true).filter((m): m is Mesh => m instanceof Mesh)
    for (const material of new Set(parts.map(m => m.material))) {
      const group = parts.filter(m => m.material === material)
      if (group.length < 2) continue
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
  const flowers = seededRandom(recipe.seed + 76123)
  const plants = Array.from({ length: recipe.foxgloves }, (_, i) => {
    const plant = createFoxglove(meshes, recipe.seed * 37 + i)
    batchFlowers(meshes, plant.root)
    const theta = flowers() * Math.PI * 2, r = Math.sqrt(flowers()) * 1.75
    plant.root.position.set((i % 2 ? -2.3 : 2.3) + Math.cos(theta) * r, 0, Math.sin(theta) * r - 1 + i % 2 * 2)
    return plant
  })
  const random = seededRandom(recipe.seed + 83271)
  const flock = Array.from({ length: recipe.oystercatchers }, () => {
    const bird = createOystercatcher(meshes)
    const theta = random() * Math.PI * 2, r = Math.sqrt(random()) * 2.25
    const home = { x: Math.cos(theta) * r, z: 2.4 + Math.sin(theta) * r }
    bird.root.position.set(home.x, 0, home.z)
    const phase = random() * 7
    bird.root.rotation.y = phase
    return { ...bird, home, phase, stride: 0 }
  })
  // Leave a bill-length gap when two foragers reach for the same spot.
  function keepSpace(position: Point) {
    let x = 0, z = 0, crowded = false
    for (const other of flock) {
      const sx = position.x - other.root.position.x, sz = position.z - other.root.position.z
      const apart = Math.hypot(sx, sz)
      if (apart > .48 || apart < .001) continue
      const push = (.48 - apart) / apart * 3
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
    const dt = Math.min(.12, Math.max(0, elapsed))
    let alert = 0
    for (const bird of flock) {
      const { position, rotation } = bird.root
      const angle = time * .18 + bird.phase
      const x = bird.home.x + .55 * Math.sin(time * .24) + .38 * Math.cos(angle)
      const z = bird.home.z + .36 * Math.cos(time * .20) + .29 * Math.sin(angle)
      if (elapsed < 0 || elapsed > .5) position.set(x, 0, z)
      const dx = position.x - (walker?.x ?? 20), dz = position.z - (walker?.z ?? 20)
      const distance = Math.hypot(dx, dz)
      const wary = distance < 2.15
      if (wary) alert++
      let vx = wary ? dx / (distance || 1) : x - position.x
      let vz = wary ? dz / (distance || 1) : z - position.z
      const separation = keepSpace(position)
      vx += separation.x
      vz += separation.z
      const gap = Math.hypot(vx, vz)
      const stepping = separation.crowded || wary || (gap > .17 && Math.sin(time + bird.phase) > .15)
      if (stepping && dt > 0) {
        const target = Math.atan2(vx, vz)
        const turn = Math.atan2(Math.sin(target - rotation.y), Math.cos(target - rotation.y))
        rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * 4)
        const step = dt * (wary ? .94 : .34) * Math.max(0, Math.cos(turn))
        position.x += step * Math.sin(rotation.y)
        position.z += step * Math.cos(rotation.y)
        const radius = Math.hypot(position.x, position.z)
        if (radius > 7.55) position.scaleInPlace(7.55 / radius)
        bird.stride += step * 2.6
      }
      bird.pose(stepping ? bird.stride : time + bird.phase, !stepping, stepping ? 1 : 0)
    }
    return alert
  }
}
