import type { TreeSpecies } from './assets/trees/tree-catalog.ts'
import { treeCollision } from './assets/trees/tree-collision.ts'
import { groundHeight } from './terrain.ts'
import type { Point } from './world.ts'
import { highwoodPlanting } from './worlds/starter/highwood-planting.ts'
import { highwoodTemplateSeedBase } from './worlds/starter/layout/highwood-planting.ts'

// Highwood's solid trunks, snags and fallen logs for walking, indexed by a grid
// so each step checks only the few nearby, not every tree in the forest. Soft
// plants (shrubs, saplings' leaves, bracken) are left out: you walk through them.

interface Trunk { kind: 'upright', x: number, z: number, radius: number, top: number }
interface Log { kind: 'lying', x: number, z: number, dx: number, dz: number, length: number, radius: number, top: number }
type Solid = Trunk | Log

const cellM = 4
const cells = new Map<string, Solid[]>()
const key = (i: number, j: number) => `${i},${j}`

function file(solid: Solid, reach: number) {
  const [x0, z0, x1, z1] = solid.kind === 'upright'
    ? [solid.x - reach, solid.z - reach, solid.x + reach, solid.z + reach]
    : [Math.min(solid.x, solid.x + solid.dx * solid.length) - reach, Math.min(solid.z, solid.z + solid.dz * solid.length) - reach, Math.max(solid.x, solid.x + solid.dx * solid.length) + reach, Math.max(solid.z, solid.z + solid.dz * solid.length) + reach]
  for (let i = Math.floor(x0 / cellM); i <= Math.floor(x1 / cellM); i++) {
    for (let j = Math.floor(z0 / cellM); j <= Math.floor(z1 / cellM); j++) {
      const list = cells.get(key(i, j)) ?? []
      list.push(solid)
      cells.set(key(i, j), list)
    }
  }
}

for (const plant of highwoodPlanting()) {
  if (plant.layer === 'understory') continue
  const collision = treeCollision({ species: plant.species as TreeSpecies, age: plant.age, exposure: plant.exposure, seed: highwoodTemplateSeedBase + plant.variant, tier: 'near' })
  if (!collision.solid) continue
  const ground = groundHeight(plant)
  const radius = collision.radius * plant.scale
  if (collision.shape === 'upright') file({ kind: 'upright', x: plant.x, z: plant.z, radius, top: ground + collision.height * plant.scale }, radius)
  else {
    // A lying log runs along the template's +x, turned by the plant's heading.
    const dx = Math.cos(plant.heading), dz = -Math.sin(plant.heading)
    file({ kind: 'lying', x: plant.x, z: plant.z, dx, dz, length: collision.length * plant.scale, radius, top: ground + (collision.axisHeight + collision.radius) * plant.scale }, radius)
  }
}

function reachOf(solid: Solid, point: Point) {
  if (solid.kind === 'upright') return Math.hypot(point.x - solid.x, point.z - solid.z)
  const along = Math.max(0, Math.min(solid.length, (point.x - solid.x) * solid.dx + (point.z - solid.z) * solid.dz))
  return Math.hypot(point.x - solid.x - solid.dx * along, point.z - solid.z - solid.dz * along)
}

// The highest Highwood solid under a walker of the given padding, or -Infinity.
export function highwoodSolidTop(point: Point, padding: number) {
  let top = -Infinity
  const i = Math.floor(point.x / cellM), j = Math.floor(point.z / cellM)
  const reach = Math.ceil(padding / cellM)
  for (let di = -reach; di <= reach; di++) {
    for (let dj = -reach; dj <= reach; dj++) {
      for (const solid of cells.get(key(i + di, j + dj)) ?? []) {
        if (reachOf(solid, point) < solid.radius + padding) top = Math.max(top, solid.top)
      }
    }
  }
  return top
}
