import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { isRescueGear, type ItemKind } from '../rescue-gear'
import { createRescueGear } from './rescue-gear'
import type { MeshFactory } from '../island-meshes'
import { surfaces } from '../materials'
import type { Point } from '../world'
import { beachUmbrellaGeometry } from './geometry/site-props'
import { clothingCounterModel, homeChestModel, wardrobeModel } from './geometry/starter-furniture'
import { islandRockGeometry, islandTreeGeometry } from './geometry/starter-scenery'
import { cargoCrateModel, extinguisherModel, loanToolboxModel } from './geometry/supply-props'

const half = 0.5
const sides = [-1, 1] as const

export const umbrellaColors = beachUmbrellaGeometry.canopy.colors

export function createHomeChest({ scene, box, paintSurface }: MeshFactory, point: Point, color: string) {
  const root = new TransformNode('Home chest', scene)
  root.position.set(point.x, 0, point.z)
  const { dimensions: { width, depth, height }, body, lining, lid, latch } = homeChestModel
  const wood = paintSurface('wood', homeChestModel.wood)
  const boxHeight = height - body.lidClearance
  box(0, boxHeight * half, 0, width - body.widthInset, boxHeight, depth - body.depthInset, wood, root)
  box(0, boxHeight - lining.belowRim, lining.z, width - lining.widthInset, lining.height, depth - lining.depthInset, color, root)
  const hinge = new TransformNode('Chest lid', scene)
  hinge.parent = root
  hinge.position.set(0, boxHeight + lid.hingeRise, depth * half)
  box(0, lid.centerY, -depth * half, width, lid.height, depth, wood, hinge)
  box(0, latch.y, -depth - latch.forwardOfLid, ...latch.size, latch.color, hinge)
  return { root, hinge }
}

export function createWardrobe({ box, paintSurface }: MeshFactory, { x, z }: Point, y: number, color: string) {
  const { body, cornice, door, panel, pull } = wardrobeModel
  const wood = paintSurface('wood', wardrobeModel.wood)
  const doors = paintSurface('wood', wardrobeModel.doorWood)
  box(x, y + body.y, z, ...body.size, wood)
  box(x, y + cornice.y, z, ...cornice.size, wood)
  for (const side of sides) {
    const doorX = x + side * door.x
    box(doorX, y + door.y, z + door.z, ...door.size, doors)
    box(doorX, y + panel.y, z + panel.z, ...panel.size, color)
    box(x + side * pull.x, y + pull.y, z + pull.z, ...pull.size, pull.color)
  }
}

export function createClothingCounter({ box, paintSurface }: MeshFactory, { x, z }: Point, y: number) {
  const { body, top, banner, cloth } = clothingCounterModel
  const wood = paintSurface('wood', clothingCounterModel.wood)
  box(x, y + body.y, z, ...body.size, wood)
  box(x, y + top.y, z, ...top.size, wood)
  box(x, y + banner.y, z + banner.z, ...banner.size, banner.color)
  for (const [index, color] of cloth.colors.entries()) {
    box(x + cloth.x, y + cloth.firstY + index * cloth.thickness, z, cloth.firstWidth - index * cloth.widthStep, cloth.thickness, cloth.depth, color)
  }
}

export function createSupply(meshes: MeshFactory, kind: ItemKind) {
  if (isRescueGear(kind)) return createRescueGear(meshes, kind)
  const { scene, box, cylinder } = meshes
  const node = new TransformNode('Supply', scene)
  if (kind === 'toolbox') {
    const { body, lid, handleSupports, handle, latch } = loanToolboxModel
    box(0, body.y, 0, ...body.size, body.color, node)
    box(0, lid.y, 0, ...lid.size, lid.color, node)
    for (const z of handleSupports.z) box(0, handleSupports.y, z, ...handleSupports.size, handle.color, node)
    box(0, handle.y, 0, ...handle.size, handle.color, node)
    box(latch.x, latch.y, 0, ...latch.size, latch.color, node)
  }
  else if (kind === 'crate') {
    const { size, body, brace, label } = cargoCrateModel
    box(0, 0, 0, size, size, size, body, node)
    for (const side of sides) box(side * brace.x, 0, 0, ...brace.size, brace.color, node)
    box(0, label.y, label.z, ...label.size, label.color, node)
  }
  else {
    const { tank, band, tankSides, head, nozzle } = extinguisherModel
    cylinder(0, tank.y, 0, tank.diameter, tank.diameter, tank.height, tankSides, tank.color, node)
    cylinder(0, band.y, 0, band.diameter, band.diameter, band.height, tankSides, band.color, node)
    box(0, nozzle.height, 0, ...head.size, head.color, node)
    box(0, nozzle.height, nozzle.center, nozzle.width, nozzle.thickness, nozzle.length, head.color, node)
  }
  return node
}

export function createUmbrella({ cylinder, surface }: MeshFactory, x: number, z: number, color: string, heightAt: (point: Point) => number = () => 0) {
  const y = heightAt({ x, z })
  const { pole, canopy, towel } = beachUmbrellaGeometry
  cylinder(x, y + pole.centreY, z, pole.topDiameter, pole.baseDiameter, pole.height, pole.sides, pole.color)
  cylinder(x, y + canopy.centreY, z, canopy.topDiameter, canopy.baseDiameter, canopy.height, canopy.sides, color)
  // Adjacent woven bands share their hems and follow the sand beneath each corner.
  const [left, right] = towel.x
  let firstZ: number = towel.firstZ
  for (const { endZ, stripe } of towel.bands) {
    const corners = [[left, firstZ], [right, firstZ], [right, endZ], [left, endZ]]
    const vertices = corners.flatMap(([dx, dz]) => [x + dx, heightAt({ x: x + dx, z: z + dz }) + towel.lift, z + dz])
    surface('Beach towel', vertices, [...towel.triangles], stripe ? color : towel.color).freezeWorldMatrix()
    firstZ = endZ
  }
}

const treeColors = [...islandTreeGeometry.canopy.colors, surfaces.leaves.color]

export function createTree({ cylinder, sphere, paintSurface }: MeshFactory, x: number, z: number, height: number, variant: number, ground = 0) {
  const { trunk, trunkHeightRatio, canopy } = islandTreeGeometry
  const trunkHeight = height * trunkHeightRatio
  cylinder(x, ground + trunkHeight * half - trunk.embedDepth * half, z, trunk.tipDiameter, trunk.baseDiameter, trunkHeight + trunk.embedDepth, trunk.sides, paintSurface('wood'))
  const leaves = paintSurface('leaves', treeColors[variant % treeColors.length])
  if (variant % canopy.broadleafEvery === 0) {
    const { crown, branch } = canopy.broadleaf
    const [width, rise, depth] = crown.sizeRatios
    sphere(x, ground + height * crown.yRatio, z, height * width, height * rise, height * depth, leaves)
    const [branchWidth, branchRise, branchDepth] = branch.sizeRatios
    sphere(
      x + height * branch.xRatio,
      ground + height * branch.yRatio,
      z + branch.z,
      height * branchWidth,
      height * branchRise,
      height * branchDepth,
      paintSurface('leaves', branch.color),
    )
  }
  else {
    const { lower, upper, sides: segments } = canopy.conifer
    cylinder(x, ground + height * lower.yRatio, z, lower.tipDiameter, height * lower.baseRatio, height * lower.heightRatio, segments, leaves)
    const finish = upper.colors[variant % upper.colors.length ? 1 : 0]
    cylinder(x, ground + height * upper.yRatio, z, upper.tipDiameter, height * upper.baseRatio, height * upper.heightRatio, segments, paintSurface('leaves', finish))
  }
}

export function createRock({ sphere, paintSurface }: MeshFactory, x: number, z: number, size: number, angle: number, light: boolean, ground = 0) {
  const { centerHeightRatio, heightRatio, depthRatio } = islandRockGeometry
  const rock = sphere(x, size * centerHeightRatio + ground, z, size, size * heightRatio, size * depthRatio, paintSurface('stone', light ? '#b0ad91' : surfaces.stone.color))
  rock.rotation.y = angle
  return rock
}
