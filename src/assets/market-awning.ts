import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { market } from '../farm'
import { createIslandMaterial } from '../materials'
import { marketAwningGeometry } from './geometry/market-awning'
import { clothHeight, gutterY, marketAwningSite } from '../worlds/starter/market-awning'

type Position = { x: number, y: number, z: number }
const { halfWidth } = marketAwningGeometry
const { back, hem, spout, splash, drain, gutterZ, base, catchHeight, grateHeight } = marketAwningSite

function between(meshes: MeshFactory, a: Position, b: Position, width: number, thickness: number, color: string, root?: TransformNode) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const piece = meshes.box((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, width, thickness, Math.hypot(dx, dy, dz), color, root)
  piece.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0)
  return piece
}

function createAwning(meshes: MeshFactory, root?: TransformNode) {
  const colors = [
    { dry: '#e5b087', wet: '#99765d' },
    { dry: '#bd654f', wet: '#844838' },
  ]
  const cloth = colors.map(({ dry, wet }, i) => {
    const material = createIslandMaterial(meshes.scene, 'Striped awning ' + i, dry)
    material.backFaceCulling = false
    return { material, dry: Color3.FromHexString(dry), wet: Color3.FromHexString(wet) }
  })
  const width = halfWidth * 2 / 7
  for (let stripe = 0; stripe < 7; stripe++) {
    const x = market.x - halfWidth + width * stripe
    const { material } = cloth[stripe % 2]
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= 6; i++) {
      const z = back.z + (hem.z - back.z) * i / 6
      const y = clothHeight(z)
      positions.push(x, y, z, x + width, y, z)
      if (i) indices.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2)
    }
    const panel = meshes.surface('Canvas awning stripe', positions, indices, material, root)
    meshes.shadows.addShadowCaster(panel)
    meshes.box(x + width / 2, hem.y - 0.057, hem.z - 0.0125, width - 0.007, 0.121 + (stripe % 2) * 0.009, 0.025, material, root)
    if (stripe === 6) continue
    for (let i = 0; i < 7; i++) {
      const z = 5.19 + i * 0.177
      meshes.box(x + width, clothHeight(z) + 0.004, z, 0.012, 0.008, 0.060, '#d6a482', root, false).rotation.x = 0.17
    }
  }
  const patchX = market.x - 1.16, patchZ = 5.52
  const patch = meshes.box(patchX, clothHeight(patchZ) + 0.013, patchZ, 0.25, 0.015, 0.22, '#d79a76', root)
  patch.rotation.x = 0.18
  patch.rotation.y = 0.085
  for (const dx of [-0.091, 0.10]) for (let i = 0; i < 3; i++) {
    const z = patchZ - 0.069 + i * 0.065
    meshes.box(patchX + dx, clothHeight(z) + 0.026, z, 0.036, 0.008, 0.015, '#f0ce9e', root, false).rotation.y = -0.25
  }
  for (const side of [-1, 1]) {
    const x = market.x + side * 1.33
    between(meshes, { x, y: clothHeight(5.15) - 0.092, z: 5.12 }, { x, y: hem.y - 0.078, z: hem.z }, 0.072, 0.089, '#805c49', root)
    between(meshes, { x, y: 2.52, z: 5.13 }, { x, y: 2.84, z: 5.92 }, 0.052, 0.058, '#977157', root)
  }
  return (amount: number) => {
    for (const { dry, wet, material } of cloth) Color3.LerpToRef(dry, wet, amount, material.diffuseColor)
  }
}

function createDrainage(meshes: MeshFactory, root?: TransformNode) {
  const zinc = '#6a8e83'
  for (const [z, lift, width] of [[gutterZ, 0, 0.11], [gutterZ - 0.049, 0.040, 0.023], [gutterZ + 0.049, 0.036, 0.024]]) {
    const east = market.x + halfWidth + 0.035
    between(meshes, { x: spout.x, y: gutterY(spout.x) + lift, z }, { x: east, y: gutterY(east) + lift, z }, width, lift ? 0.069 : 0.031, zinc, root)
  }
  for (const x of [37.72, 38.73, 40.22]) {
    const bracket = x === 38.73 ? '#ba895e' : '#758072'
    meshes.box(x, gutterY(x) + 0.004, gutterZ, 0.045, 0.056, 0.143, bracket, root).name = 'Gutter strap'
    const rivet = meshes.cylinder(x, gutterY(x) + 0.026, gutterZ + 0.076, 0.025, 0.025, 0.014, 8, '#cfa277', root)
    rivet.rotation.x = Math.PI / 2
  }
  between(meshes, { x: spout.x + 0.028, y: 2.79, z: gutterZ }, spout, 0.096, 0.060, '#a77354', root)
  const linkLength = 0.267
  const firstLinkY = spout.y - 0.25
  const hanger = between(meshes, { ...spout, y: spout.y + 0.012 }, { ...spout, y: firstLinkY + linkLength / 2 - 0.016 }, 0.031, 0.030, '#876951', root)
  hanger.name = 'Rain chain hanger'
  const collar = meshes.cylinder(spout.x, spout.y - 0.035, spout.z, 0.065, 0.050, 0.049, 9, '#aa805d', root)
  collar.name = 'Rain chain collar'
  for (let link = 0; link < 9; link++) {
    const y = firstLinkY - link * 0.265
    meshes.box(spout.x, y, spout.z, 0.023, linkLength, 0.022, '#876951', root)
    if (link % 2 === 0) meshes.cylinder(spout.x, y - 0.058, spout.z, 0.090, 0.051, 0.062, 9, link === 4 ? '#759184' : '#aa805d', root)
  }

  const length = drain.z - splash.z
  between(meshes, { ...splash, y: catchHeight - 0.011 }, { ...drain, y: grateHeight - 0.011 }, 0.255, 0.018, '#827c6b', root)
  for (const side of [-1, 1]) {
    for (let stone = 0; stone < 5; stone++) {
      const z = splash.z + (stone + 0.47) * length / 5
      const y = catchHeight + (grateHeight - catchHeight) * (z - splash.z) / length
      meshes.box(splash.x + side * (0.16 + 0.011 * Math.sin(stone * 2)), y + 0.004, z, 0.092, 0.040, length / 5 - 0.009, stone % 2 ? '#b9aa89' : '#c8b99c', root).rotation.y = Math.sin(stone * 3) * 0.10
    }
  }
  meshes.box(splash.x, base + 0.014, splash.z - 0.03, 0.45, 0.033, 0.26, '#a69c83', root).name = 'Rain chain splash stone'
  meshes.box(drain.x, grateHeight - 0.004, drain.z, 0.36, 0.023, 0.25, '#545b54', root).name = 'Storm drain frame'
  for (let bar = -2; bar <= 2; bar++) meshes.box(drain.x, grateHeight + 0.012, drain.z + bar * 0.048, 0.319, 0.013, 0.018, '#9b9b82', root).name = 'Storm drain bar'
  const leaf = meshes.box(drain.x + 0.094, grateHeight + 0.024, drain.z - 0.03, 0.061, 0.008, 0.109, '#ac754c', root, false)
  leaf.name = 'Leaf caught on the grate'
  leaf.rotation.y = -0.46
}

export function createMarketAwning(meshes: MeshFactory, root?: TransformNode) {
  const wetCloth = createAwning(meshes, root)
  createDrainage(meshes, root)
  return wetCloth
}
