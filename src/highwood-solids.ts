import type { TreeTemplateOptions } from './assets/trees/tree-catalog.ts'
import { treeCollision } from './assets/trees/tree-collision.ts'
import { groundHeight } from './terrain.ts'
import type { Point } from './world.ts'
import { highwoodPlanting, logRise, plantTemplateOptions } from './worlds/starter/highwood-planting.ts'

// Highwood's solid trunks, snags and fallen logs for walking, indexed by a grid
// so each step checks only the few nearby, not every tree in the forest. Soft
// plants (shrubs, saplings' leaves, bracken) are left out: you walk through them.
// The canopy trees are indexed the same way for wind shelter and crown rustle.
// The understory layer is soft by design, even a young willow grown as a tree.

interface Trunk { kind: 'upright', x: number, z: number, radius: number, top: number }
interface Log { kind: 'lying', x: number, z: number, dx: number, dz: number, length: number, radius: number, top: number, rise: number }
type Solid = Trunk | Log

const cellM = 4
const cells = new Map<string, Solid[]>()
// Crowns for sound: pines hush, broadleaves flutter.
interface Crown { x: number, z: number, height: number, leafy: boolean }
const crowns = new Map<string, Crown[]>()
const needleSpecies = new Set(['scots-pine', 'pine-sapling', 'pine-snag'])
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
  const collision = treeCollision(plantTemplateOptions(plant, 'near') as TreeTemplateOptions)
  if (!collision.solid) continue
  if (plant.layer === 'canopy' && collision.shape === 'upright') {
    const list = crowns.get(key(Math.floor(plant.x / cellM), Math.floor(plant.z / cellM))) ?? []
    list.push({ x: plant.x, z: plant.z, height: collision.height * plant.scale, leafy: !needleSpecies.has(plant.species) })
    crowns.set(key(Math.floor(plant.x / cellM), Math.floor(plant.z / cellM)), list)
  }
  const ground = groundHeight(plant)
  const radius = collision.radius * plant.scale
  if (collision.shape === 'upright') file({ kind: 'upright', x: plant.x, z: plant.z, radius, top: ground + collision.height * plant.scale }, radius)
  else {
    // A lying log runs along the template's +x, turned by the plant's heading.
    const dx = Math.cos(plant.heading), dz = -Math.sin(plant.heading)
    const length = collision.length * plant.scale
    // The log follows the ground from its root to its far end, so its top rises along it.
    file({ kind: 'lying', x: plant.x, z: plant.z, dx, dz, length, radius, top: ground + (collision.axisHeight + collision.radius) * plant.scale, rise: logRise(plant, length) }, radius)
  }
}

// Distance from a point to a solid, and the solid's top there.
function contact(solid: Solid, point: Point) {
  if (solid.kind === 'upright') return { reach: Math.hypot(point.x - solid.x, point.z - solid.z), top: solid.top }
  const along = Math.max(0, Math.min(solid.length, (point.x - solid.x) * solid.dx + (point.z - solid.z) * solid.dz))
  return { reach: Math.hypot(point.x - solid.x - solid.dx * along, point.z - solid.z - solid.dz * along), top: solid.top + solid.rise * along }
}

// The highest Highwood solid under a walker of the given padding, or -Infinity.
export function highwoodSolidTop(point: Point, padding: number) {
  let top = -Infinity
  const i = Math.floor(point.x / cellM), j = Math.floor(point.z / cellM)
  const reach = Math.ceil(padding / cellM)
  for (let di = -reach; di <= reach; di++) {
    for (let dj = -reach; dj <= reach; dj++) {
      for (const solid of cells.get(key(i + di, j + dj)) ?? []) {
        const { reach, top: here } = contact(solid, point)
        if (reach < solid.radius + padding) top = Math.max(top, here)
      }
    }
  }
  return top
}

// Highwood's canopy trees within `reach` metres of a point, from the grid cells around it.
export function highwoodCrownsWithin(point: Point, reach: number) {
  const found: Crown[] = []
  const i = Math.floor(point.x / cellM), j = Math.floor(point.z / cellM), span = Math.ceil(reach / cellM)
  for (let di = -span; di <= span; di++) {
    for (let dj = -span; dj <= span; dj++) {
      for (const crown of crowns.get(key(i + di, j + dj)) ?? []) if (Math.hypot(crown.x - point.x, crown.z - point.z) < reach) found.push(crown)
    }
  }
  return found
}
