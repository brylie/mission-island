import { highwoodForestLook as look } from './assets/recipes/highwood-forest.ts'
import { treeSpecies, type TreeTemplateOptions } from './assets/trees/tree-catalog.ts'
import { treeCollision } from './assets/trees/tree-collision.ts'
import { groundHeight } from './terrain.ts'
import type { Point } from './world.ts'
import { plantTemplateOptions, type Planting } from './worlds/starter/highwood-planting.ts'

// Where a Highwood plant stands, so no base hangs in the air on a slope. A trunk stands upright on
// the lowest ground under its base; its uphill side runs into the ground, as a real trunk's does.
// A shrub lies on the slope instead: its template is sheared so its base follows the plane of the
// ground under it, which keeps a low mat of heather from being half buried uphill. The forest
// draws each plant from this, and a test holds every base to the ground.

const fullTurn = Math.PI + Math.PI
const quartersInTurn = 4
const halvesInTurn = 2
const half = 0.5

const habitOf = (plant: Planting) => treeSpecies[(plantTemplateOptions(plant, 'near') as TreeTemplateOptions).species].habit

// The radius of a plant's base, in metres: the share of its collision radius it stands on.
export function plantBaseRadius(plant: Planting) {
  const options = plantTemplateOptions(plant, 'near') as TreeTemplateOptions
  const collision = treeCollision(options)
  if (collision.shape !== 'upright') return 0
  return collision.radius * plant.scale * look.seat.baseShare[habitOf(plant)]
}

// The height of a plant's base at its centre, and the slope (rise per metre east and north) its
// base is sheared to; a point of the base at offset (dx, dz) stands at y + x·dx + z·dz.
export function plantSeat(plant: Planting) {
  const radius = plantBaseRadius(plant)
  const centre = groundHeight(plant)
  const none = { y: centre - look.sinkM, slope: { x: 0, z: 0 } }
  if (radius <= 0) return none
  const ring: (Point & { ground: number })[] = Array.from({ length: look.seat.directions }, (_, k) => {
    const angle = k * fullTurn / look.seat.directions
    const offset = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
    return { ...offset, ground: groundHeight({ x: plant.x + offset.x, z: plant.z + offset.z }) }
  })
  if (habitOf(plant) !== 'mound') return { ...none, y: Math.min(centre, ...ring.map((p) => p.ground)) - look.sinkM }
  // The plane's slope from opposite sides of the ring, then lowered until no part of the ring
  // stands below it.
  const across = (k: number) => (ring[k].ground - ring[k + look.seat.directions / halvesInTurn].ground) / (radius + radius)
  const ground = { x: across(0), z: across(look.seat.directions / quartersInTurn) }
  // Past the shear limit the shrub leans only so far, and the rest of the slope buries its uphill side.
  const lean = Math.min(1, look.seat.maxShear / Math.max(Math.hypot(ground.x, ground.z), Number.EPSILON))
  const slope = { x: ground.x * lean, z: ground.z * lean }
  const lowest = Math.min(centre, ...ring.map((p) => p.ground - p.x * slope.x - p.z * slope.z))
  return { y: lowest - look.sinkM, slope }
}

// How deep the ground under a plant's base rises above where its base is drawn, at most, sampled
// between the seat's own directions. A trunk is meant to stand into its hill; a shrub is not.
function plantBuried(plant: Planting) {
  const radius = plantBaseRadius(plant)
  if (radius <= 0) return 0
  const { y, slope } = plantSeat(plant)
  const probes = look.seat.directions + look.seat.directions
  let deepest = 0
  for (let k = 0; k < probes; k++) {
    const angle = (k + half) * fullTurn / probes
    const dx = Math.cos(angle) * radius, dz = Math.sin(angle) * radius
    deepest = Math.max(deepest, groundHeight({ x: plant.x + dx, z: plant.z + dz }) - (y + dx * slope.x + dz * slope.z))
  }
  return deepest
}

// Whether a plant is a shrub tall enough to look wrong half buried in its hill.
export function tallShrub(plant: Planting) {
  if (habitOf(plant) !== 'mound') return false
  const collision = treeCollision(plantTemplateOptions(plant, 'near') as TreeTemplateOptions)
  return collision.shape === 'upright' && collision.height * plant.scale >= look.seat.matHeightM
}

// Whether a plant can stand where it is: a tall shrub needs ground even enough to lie on.
export const plantRests = (plant: Planting) => !tallShrub(plant) || plantBuried(plant) <= look.seat.shrubBuryM
