import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { driftwoodFoxgloves, driftwoodWrack, shellglassLimpets } from '../worlds/starter/sites'
import { createFoxglove } from './foxglove'

export function createFieldOutingScenery(meshes: MeshFactory) {
  const foxgloves = driftwoodFoxgloves.map((point, i) => {
    const plant = createFoxglove(meshes, 173 + i * 37)
    plant.root.position.set(point.x, groundHeight(point), point.z)
    plant.root.scaling.setAll(1 - i * 0.075)
    return plant
  })
  for (let i = 0; i < 19; i++) {
    const x = driftwoodWrack.x + (i - 7) * 0.12, z = driftwoodWrack.z - (i - 7) * 0.22 + Math.sin(i * 2.7) * 0.13
    const y = groundHeight({ x, z })
    const fragment = meshes.sphere(x, y + 0.026, z, i % 4 ? 0.23 : 0.10, 0.048, 0.085, i % 4 ? '#645d3d' : '#e9d4a9', undefined, false, 5)
    fragment.rotation.y = -0.8 + Math.sin(i * 2.4) * 0.6
  }
  for (const [i, point] of shellglassLimpets.entries()) {
    const y = groundHeight(point)
    meshes.sphere(point.x, y + 0.015, point.z, 0.20, 0.09, 0.19, '#686e5d', undefined, false, 6)
    meshes.cylinder(point.x, y + 0.066, point.z, 0.027, 0.108 - i * 0.012, 0.065, 9, '#d8c599')
  }

  return (time: number) => {
    for (const plant of foxgloves) plant.sway(time)
  }
}
