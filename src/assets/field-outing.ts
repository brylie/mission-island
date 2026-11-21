import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { driftwoodFoxgloves, driftwoodWrack, shellglassLimpets } from '../worlds/starter/sites'
import { createFoxglove } from './foxglove'

export function createFieldOutingScenery(meshes: MeshFactory) {
  const foxgloves = driftwoodFoxgloves.map((point, i) => {
    const plant = createFoxglove(meshes, 173 + i * 37)
    plant.root.position.set(point.x, groundHeight(point), point.z)
    plant.root.scaling.setAll(1 - i * .075)
    return plant
  })
  for (let i = 0; i < 19; i++) {
    const x = driftwoodWrack.x + (i - 7) * .12, z = driftwoodWrack.z - (i - 7) * .22 + Math.sin(i * 2.7) * .13
    const y = groundHeight({ x, z })
    const fragment = meshes.sphere(x, y + .026, z, i % 4 ? .23 : .10, .048, .085,
      i % 4 ? '#645d3d' : '#e9d4a9', undefined, false, 5)
    fragment.rotation.y = -.8 + Math.sin(i * 2.4) * .6
  }
  for (const [i, point] of shellglassLimpets.entries()) {
    const y = groundHeight(point)
    meshes.sphere(point.x, y + .015, point.z, .20, .09, .19, '#686e5d', undefined, false, 6)
    meshes.cylinder(point.x, y + .066, point.z, .027, .108 - i * .012, .065, 9, '#d8c599')
  }

  return (time: number) => {
    for (const plant of foxgloves) plant.sway(time)
  }
}
