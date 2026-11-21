import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { cemeteryWall, graveMarkerGeometry, timberStackGeometry, vehicleBayMarkings, yardSurfaces } from '../assets/geometry/saltwind-yard'
import type { MeshFactory } from '../island-meshes'
import { alderwatchCemetery, markedVehicleBays, timberStacks } from '../worlds/saltwind/layout/sites'
import { createExterior } from './exteriors'
import { islandBuildings } from './lots'
import { buildTarnstepLedges } from './quarry-art'
import { helipad, pavedYards, roundYards, sites } from './sites'
import { groundHeight, surfaceHeight } from './terrain'

const cream = '#f5e5c2', pavement = '#858780'
const half = 0.5
const quarterTurn = Math.PI * half
const diameterPerRadius = 2

function paintBay(meshes: MeshFactory, x: number, y: number, z: number, width: number, depth: number) {
  const { endLine, sideLine } = vehicleBayMarkings
  for (const side of [-1, 1]) {
    meshes.box(x + side * width * half, y + sideLine.raise, z, sideLine.width, sideLine.thickness, depth, cream, undefined, false)
  }
  meshes.box(x, y + endLine.raise, z - depth * half, width, endLine.thickness, endLine.depth, cream, undefined, false)
}

function buildTimberStacks(meshes: MeshFactory) {
  const { placements, baseCentreY } = timberStacks
  const { courses, bottomLogCount, courseRise, logSpacing, log, endGrain } = timberStackGeometry
  const bottomRowMidpoint = (bottomLogCount - 1) * half
  for (const [x, z] of placements) for (let course = 0; course < courses; course++) {
    for (let index = 0; index < bottomLogCount - course; index++) {
      const trunk = meshes.cylinder(x + (index + course * half - bottomRowMidpoint) * logSpacing, baseCentreY + course * courseRise, z, log.endDiameter, log.buttDiameter, log.length, log.sides, log.color)
      trunk.rotation.x = quarterTurn
      for (const side of [-1, 1]) {
        meshes.cylinder(trunk.position.x, trunk.position.y, z + side * endGrain.z, endGrain.diameter, endGrain.diameter, endGrain.thickness, log.sides, endGrain.color).rotation.x = quarterTurn
      }
    }
  }
}

function buildCemetery(meshes: MeshFactory) {
  const { graveRows, wall } = alderwatchCemetery
  const { base, slab, crest, pot, flowers } = graveMarkerGeometry
  for (const z of graveRows.z) for (const x of graveRows.x) {
    const y = groundHeight(x, z)
    const variant = (x + z) % slab.heightVariants
    const height = slab.minHeight + variant * slab.heightStep
    meshes.box(x, y + base.centreY, z, ...base.size, base.color)
    meshes.box(x, y + height * half + slab.rise, z, slab.width, height, slab.depth, slab.color)
    meshes.sphere(x, y + height + slab.rise, z, ...crest.size, slab.color, undefined, true, crest.segments)
    if (variant === 0) {
      const potX = x + pot.x, potZ = z + pot.z
      meshes.cylinder(potX, y + pot.centreY, potZ, pot.rim, pot.base, pot.height, pot.sides, pot.color)
      for (const dx of flowers.x) {
        const { stem, blossom } = flowers
        meshes.box(potX + dx, y + stem.centreY, potZ, ...stem.size, stem.color)
        meshes.sphere(potX + dx, y + blossom.centreY, potZ, ...blossom.size, blossom.color)
      }
    }
  }
  for (const { x, y, z } of wall.sides) meshes.box(x, y, z, ...cemeteryWall.sides, cemeteryWall.color)
  for (const { x, y, z } of wall.front) meshes.box(x, y, z, ...cemeteryWall.front, cemeteryWall.color)
  meshes.box(wall.back.x, wall.back.y, wall.back.z, ...cemeteryWall.back, cemeteryWall.color)
}

function buildHelipad(meshes: MeshFactory) {
  const { x, z, radius } = helipad
  const y = groundHeight(x, z)
  const { helipad: pad, helipadMarking, helipadLights: lights } = yardSurfaces
  const diameter = radius * diameterPerRadius
  meshes.cylinder(x, y + pad.thickness * half, z, diameter, diameter, pad.thickness, pad.sides, pad.color)
  const { upright, crossbar } = helipadMarking
  for (const side of [-1, 1]) meshes.box(x + side * upright.x, y + upright.raise, z, ...upright.size, cream, undefined, false)
  meshes.box(x, y + crossbar.raise, z, ...crossbar.size, cream, undefined, false)
  const lightsPerHalfTurn = lights.count * half
  for (let i = 0; i < lights.count; i++) {
    const angle = i * Math.PI / lightsPerHalfTurn
    meshes.box(x + lights.radius * Math.cos(angle), y + lights.raise, z + lights.radius * Math.sin(angle), ...lights.size, lights.color)
  }
}

const sidewaysProjectionThreshold = 0.5
const minimumFoundationHeight = 0.48
const foundationBelowGround = 0.22

export function buildYards(meshes: MeshFactory, omit?: string) {
  for (const building of islandBuildings) {
    if (building.site === omit) continue
    const { x, z, width, depth, facing } = building
    const sideways = Math.abs(Math.sin(facing)) > sidewaysProjectionThreshold
    const a = (sideways ? depth : width) * half, b = (sideways ? width : depth) * half
    const y = groundHeight(x, z)
    const low = Math.min(...[-1, 1].flatMap((dx) => [-1, 1].map((dz) => groundHeight(x + dx * a, z + dz * b))))
    const model = createExterior(meshes, building, Math.max(minimumFoundationHeight, y - low + foundationBelowGround))
    model.position.set(x, y, z)
    model.rotation.y = facing
    meshes.batchModel(model)
  }

  const { pavingThickness, mineTurnaround } = yardSurfaces
  for (const pad of pavedYards.filter(({ id }) => !['runway', 'taxi', 'air-apron'].includes(id))) {
    meshes.box(pad.x, pad.y - pavingThickness * half, pad.z, pad.width, pavingThickness, pad.depth, pavement, undefined, false)
  }
  const [, mine] = roundYards
  const padRoot = new TransformNode('Mine turnaround', meshes.scene)
  const diameter = mine.radius * diameterPerRadius
  const turnaround = meshes.cylinder(mine.x, mine.y - mineTurnaround.thickness * half, mine.z, diameter, diameter, mineTurnaround.thickness, mineTurnaround.sides, pavement, padRoot)
  turnaround.receiveShadows = true
  meshes.shadows.removeShadowCaster(turnaround)
  for (const { id, stop } of sites) {
    const bay = markedVehicleBays[id]
    if (bay) paintBay(meshes, stop.x, surfaceHeight(stop.x, stop.z), stop.z, bay.width, bay.depth)
  }

  buildHelipad(meshes)
  buildTarnstepLedges(meshes)
  // A clear service corridor runs between the log stacks and the mill.
  buildTimberStacks(meshes)
  buildCemetery(meshes)
}
