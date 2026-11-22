import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { driftwoodFoxgloves, driftwoodWrack, shellglassLimpets } from '../worlds/starter/sites'
import { driftwoodDressing } from '../worlds/starter/layout/scenery'
import { shellglassLimpet, wrackFragment } from './geometry/field-outing'
import { createFoxglove } from './foxglove'

export function createFieldOutingScenery(meshes: MeshFactory) {
  const { foxglove, wrack } = driftwoodDressing
  const { foot, shell } = shellglassLimpet
  const foxgloves = driftwoodFoxgloves.map((point, i) => {
    const plant = createFoxglove(meshes, foxglove.firstSeed + i * foxglove.seedStep)
    plant.root.position.set(point.x, groundHeight(point), point.z)
    plant.root.scaling.setAll(1 - i * foxglove.scaleStep)
    return plant
  })
  for (let i = 0; i < wrack.count; i++) {
    const x = driftwoodWrack.x + (i - wrack.middle) * wrack.spacingX, z = driftwoodWrack.z - (i - wrack.middle) * wrack.spacingZ + Math.sin(i * wrack.ripple) * wrack.rippleWidth
    const y = groundHeight({ x, z })
    const { paleEvery, centreY, width, paleWidth, height, depth, color, paleColor, segments, turn } = wrackFragment
    const pale = i % paleEvery === 0
    const fragment = meshes.sphere(x, y + centreY, z, pale ? paleWidth : width, height, depth, pale ? paleColor : color, undefined, false, segments)
    fragment.rotation.y = turn.base + Math.sin(i * turn.wave) * turn.amplitude
  }
  for (const [i, point] of shellglassLimpets.entries()) {
    const y = groundHeight(point)
    meshes.sphere(point.x, y + foot.centreY, point.z, ...foot.size, foot.color, undefined, false, foot.segments)
    meshes.cylinder(point.x, y + shell.centreY, point.z, shell.tip, shell.base - i * shell.baseStep, shell.height, shell.sides, shell.color)
  }

  return (time: number) => {
    for (const plant of foxgloves) plant.sway(time)
  }
}
