import type { MeshFactory } from './island-meshes'
import { groundHeight, waterLevel } from './terrain'
import { ferryTerminal } from './world'

export function createFerryTerminal({ box, paintSurface }: MeshFactory) {
  const { x, z, width } = ferryTerminal
  const y = groundHeight(ferryTerminal)
  const concrete = paintSurface('concrete', '#92978b')
  const wood = paintSurface('wood', '#87674d')
  const steel = '#4c6461'
  const apronEnd = -40
  box(x, y - .08, (z + apronEnd) / 2, width, .23, z - apronEnd, concrete)
  for (const side of [-1, 1]) {
    const edge = x + side * (width / 2 - .12)
    box(edge, y + .56, z, .24, 1.12, .24, wood)
    box(edge, y + .44, -35.6, .18, .8, 9, concrete)
    box(edge, waterLevel - .85, -43.9, .32, 2.4, .32, steel)
    box(edge, waterLevel + .11, -43.4, .19, .29, 6.6, steel).rotation.x = side * .04
  }
  box(x, y + .78, z, width, .32, .19, '#aa622f')
  for (const dx of [-2.2, -1.45, -.7, .05, .8, 1.55, 2.3]) {
    box(x + dx, y + .79, z + .10, .24, .33, .02, '#f7cf79', undefined, false).rotation.z = -.42
  }
  for (const [i, boardZ] of [-40.3, -41, -41.7, -44, -44.7, -45.4, -46.1].entries()) {
    const last = i === 2 || i === 3
    const plank = box(x + (last ? .62 : 0), waterLevel + .23 - (last ? .16 : 0), boardZ,
      last ? width - 1.45 : width, .22, .66, wood)
    if (last) plank.rotation.z = i === 2 ? -.065 : .1
  }
}
