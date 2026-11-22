import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { market } from '../farm'
import { createIslandMaterial } from '../materials'
import { clothHeight, gutterY, marketAwningSite } from '../worlds/starter/market-awning'
import { marketAwningDrainage, marketAwningFabric, marketAwningGeometry } from './geometry/market-awning'

type Position = { x: number, y: number, z: number }
const { halfWidth } = marketAwningGeometry
const { back, hem, spout, splash, drain, gutterZ, base, catchHeight, grateHeight } = marketAwningSite
const half = 0.5
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const
const verticesPerSection = 2

function between(meshes: MeshFactory, a: Position, b: Position, width: number, thickness: number, color: string, root?: TransformNode) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const piece = meshes.box((a.x + b.x) * half, (a.y + b.y) * half, (a.z + b.z) * half, width, thickness, Math.hypot(dx, dy, dz), color, root)
  piece.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0)
  return piece
}

function assembleStripes(meshes: MeshFactory, root?: TransformNode) {
  const { colors, stripeCount, panelsPerStripe, hem: valance, seam } = marketAwningFabric
  const cloth = colors.map(({ dry, wet }, i) => {
    const material = createIslandMaterial(meshes.scene, 'Striped awning ' + i, dry)
    material.backFaceCulling = false
    return { material, dry: Color3.FromHexString(dry), wet: Color3.FromHexString(wet) }
  })
  const width = (halfWidth + halfWidth) / stripeCount
  for (let stripe = 0; stripe < stripeCount; stripe++) {
    const x = market.x - halfWidth + width * stripe
    const band = stripe % cloth.length
    const { material } = cloth[band]
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= panelsPerStripe; i++) {
      const z = back.z + (hem.z - back.z) * i / panelsPerStripe
      const y = clothHeight(z)
      positions.push(x, y, z, x + width, y, z)
      if (i) {
        const left = (i - 1) * verticesPerSection, nextLeft = i * verticesPerSection
        indices.push(left, left + 1, nextLeft, left + 1, nextLeft + 1, nextLeft)
      }
    }
    const panel = meshes.surface('Canvas awning stripe', positions, indices, material, root)
    meshes.shadows.addShadowCaster(panel)
    meshes.box(x + width * half, hem.y - valance.belowEdge, hem.z - valance.insetZ, width - valance.widthGap, valance.height + band * valance.alternateDrop, valance.depth, material, root)
    if (stripe === stripeCount - 1) continue
    for (let i = 0; i < seam.count; i++) {
      const z = back.z + seam.startFromBack + i * seam.spacing
      meshes.box(x + width, clothHeight(z) + seam.lift, z, ...seam.size, seam.color, root, false).rotation.x = seam.pitch
    }
  }
  return (amount: number) => {
    for (const { dry, wet, material } of cloth) Color3.LerpToRef(dry, wet, amount, material.diffuseColor)
  }
}

function trimAwning(meshes: MeshFactory, root?: TransformNode) {
  const { patch, support } = marketAwningFabric
  const patchX = market.x + patch.x, patchZ = hem.z - patch.beforeHem
  const canvas = meshes.box(patchX, clothHeight(patchZ) + patch.lift, patchZ, ...patch.size, patch.color, root)
  canvas.rotation.x = patch.pitch
  canvas.rotation.y = patch.heading
  const { stitches } = patch
  for (const dx of stitches.x) for (let i = 0; i < stitches.count; i++) {
    const z = patchZ + stitches.firstZ + i * stitches.spacing
    meshes.box(patchX + dx, clothHeight(z) + stitches.lift, z, ...stitches.size, stitches.color, root, false).rotation.y = stitches.heading
  }
  const { rafter, brace } = support
  for (const side of sides) {
    const x = market.x + side * support.x
    between(
      meshes,
      { x, y: clothHeight(back.z + rafter.contactFromBack) - rafter.belowCloth, z: back.z + rafter.startFromBack },
      { x, y: hem.y - rafter.belowHem, z: hem.z },
      rafter.width,
      rafter.thickness,
      rafter.color,
      root,
    )
    between(
      meshes,
      { x, y: brace.startY, z: back.z + brace.startFromBack },
      { x, y: brace.endY, z: back.z + brace.endFromBack },
      brace.width,
      brace.thickness,
      brace.color,
      root,
    )
  }
}

function buildGutter(meshes: MeshFactory, root?: TransformNode) {
  const { gutter } = marketAwningDrainage
  const east = market.x + halfWidth + gutter.endOverhang
  for (const part of gutter.pieces) {
    const z = gutterZ + part.z
    between(meshes, { x: spout.x, y: gutterY(spout.x) + part.lift, z }, { x: east, y: gutterY(east) + part.lift, z }, part.width, part.thickness, gutter.color, root)
  }
  const { straps, rivet, outlet } = gutter
  for (const strap of straps.positions) {
    const x = market.x + strap.x
    meshes.box(x, gutterY(x) + straps.lift, gutterZ, ...straps.size, strap.color, root).name = 'Gutter strap'
    meshes.cylinder(x, gutterY(x) + rivet.lift, gutterZ + rivet.z, rivet.diameter, rivet.diameter, rivet.height, rivet.sides, rivet.color, root).rotation.x = quarterTurn
  }
  between(meshes, { x: spout.x + outlet.x, y: spout.y + outlet.rise, z: gutterZ }, spout, outlet.width, outlet.thickness, outlet.color, root)
}

function hangRainChain(meshes: MeshFactory, root?: TransformNode) {
  const { chain } = marketAwningDrainage
  const { hanger, collar, cup } = chain
  const firstLinkY = spout.y - chain.firstDrop
  const hook = between(
    meshes,
    { ...spout, y: spout.y + hanger.aboveSpout },
    { ...spout, y: firstLinkY + chain.length * half - hanger.overlap },
    hanger.width,
    hanger.thickness,
    chain.color,
    root,
  )
  hook.name = 'Rain chain hanger'
  meshes.cylinder(spout.x, spout.y - collar.drop, spout.z, collar.top, collar.bottom, collar.height, chain.sides, collar.color, root).name = 'Rain chain collar'
  for (let link = 0; link < chain.count; link++) {
    const y = firstLinkY - link * chain.spacing
    meshes.box(spout.x, y, spout.z, chain.width, chain.length, chain.depth, chain.color, root)
    if (link % cup.every === 0) {
      const color = link === cup.accentIndex ? cup.accent : cup.color
      meshes.cylinder(spout.x, y - cup.drop, spout.z, cup.top, cup.bottom, cup.height, chain.sides, color, root)
    }
  }
}

function buildRunnel(meshes: MeshFactory, root?: TransformNode) {
  const { runnel, splashStone, grate } = marketAwningDrainage
  const { bed, edging } = runnel
  const length = drain.z - splash.z
  between(meshes, { ...splash, y: catchHeight - bed.drop }, { ...drain, y: grateHeight - bed.drop }, bed.width, bed.depth, bed.color, root)
  for (const side of sides) for (let stone = 0; stone < edging.count; stone++) {
    const z = splash.z + (stone + edging.firstFraction) * length / edging.count
    const y = catchHeight + (grateHeight - catchHeight) * (z - splash.z) / length
    const x = splash.x + side * (edging.x + edging.variation * Math.sin(stone * edging.ripple))
    const color = edging.colors[stone % edging.colors.length]
    const block = meshes.box(x, y + edging.rise, z, edging.width, edging.height, length / edging.count - edging.gap, color, root)
    block.rotation.y = Math.sin(stone * edging.yawRate) * edging.yaw
  }
  meshes.box(splash.x, base + splashStone.rise, splash.z + splashStone.z, ...splashStone.size, splashStone.color, root).name = 'Rain chain splash stone'
  const { frame, bars, leaf } = grate
  meshes.box(drain.x, grateHeight - frame.drop, drain.z, ...frame.size, frame.color, root).name = 'Storm drain frame'
  for (const bar of bars.positions) meshes.box(drain.x, grateHeight + bars.rise, drain.z + bar * bars.spacing, ...bars.size, bars.color, root).name = 'Storm drain bar'
  const caughtLeaf = meshes.box(drain.x + leaf.x, grateHeight + leaf.rise, drain.z + leaf.z, ...leaf.size, leaf.color, root, false)
  caughtLeaf.name = 'Leaf caught on the grate'
  caughtLeaf.rotation.y = leaf.heading
}

export function createMarketAwning(meshes: MeshFactory, root?: TransformNode) {
  const wetCloth = assembleStripes(meshes, root)
  trimAwning(meshes, root)
  buildGutter(meshes, root)
  hangRainChain(meshes, root)
  buildRunnel(meshes, root)
  return wetCloth
}
