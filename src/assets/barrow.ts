import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { barrowFeet, barrowFrame, barrowTray, barrowWheel, packedCarrotSlots } from './geometry/barrow'
import { buildHarvestedCarrot } from './harvested-carrot'

export { barrowFeet } from './geometry/barrow'
export { buildHarvestedCarrot } from './harvested-carrot'

type Vertex = readonly [number, number, number]
const half = 0.5
const quarterTurn = Math.PI * half

function buildTray(meshes: MeshFactory, root: TransformNode) {
  const { rim, floor, innerRim, base, panels, lip } = barrowTray
  const { box, surface, shadows } = meshes
  const inner = rim.map(([x, y, z]): Vertex => [x * innerRim.insetScale, y - innerRim.drop, z * innerRim.insetScale])
  box(0, base.y, 0, ...base.size, base.color, root)
  const addPanel = (name: string, points: Vertex[], color: string) => {
    const panel = surface(name, points.flat(), [...panels.triangles], color, root)
    shadows.addShadowCaster(panel, false)
  }
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length
    addPanel('Pressed steel tray', [floor[i], floor[j], rim[j], rim[i]], panels.steel)
    addPanel('Painted tray inside', [floor[j], floor[i], inner[i], inner[j]], panels.interior)
    const [x, y, z] = rim[i]
    const [nextX, nextY, nextZ] = rim[j]
    const edge = box((x + nextX) * half, (y + nextY) * half, (z + nextZ) * half, lip.width, lip.height, Math.hypot(nextX - x, nextY - y, nextZ - z) + lip.overhang, lip.color, root)
    edge.rotation.set(-Math.atan2(nextY - y, Math.hypot(nextX - x, nextZ - z)), Math.atan2(nextX - x, nextZ - z), 0)
  }
}

export function createBarrow(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const { radius, axleZ, halfWidth, tire, rim, axle: shaft, spokes } = barrowWheel
  const root = new TransformNode('Farm wheelbarrow', scene)
  const axle = new TransformNode('Barrow axle', scene)
  axle.parent = root
  axle.position.set(0, radius, axleZ)
  const wheel = new TransformNode('Farm barrow wheel', scene)
  wheel.parent = axle
  const diameter = radius + radius
  const wheelWidth = halfWidth + halfWidth
  cylinder(0, 0, 0, diameter, diameter, wheelWidth, tire.segments, tire.color, wheel).rotation.z = quarterTurn
  cylinder(0, 0, 0, rim.diameter, rim.diameter, wheelWidth + rim.extraWidth, rim.segments, rim.color, wheel).rotation.z = quarterTurn
  cylinder(0, 0, 0, shaft.diameter, shaft.diameter, shaft.width, shaft.segments, shaft.color, axle).rotation.z = quarterTurn
  for (const side of [-1, 1]) {
    for (const angle of spokes.angles) {
      box(side * spokes.x, 0, 0, ...spokes.size, spokes.color, wheel).rotation.x = angle
    }
  }

  const tilt = new TransformNode('Barrow frame tilt', scene)
  tilt.parent = axle
  const frame = new TransformNode('Tray and handles', scene)
  frame.parent = tilt
  frame.position.set(0, -radius, -axleZ)
  buildTray(meshes, frame)
  const { rail, grip, axleStrut, leg, legBrace, footPad, crossBrace } = barrowFrame
  for (const side of [-1, 1]) {
    const handle = box(side * rail.center[0], rail.center[1], rail.center[2], ...rail.size, rail.color, frame)
    handle.rotation.set(rail.pitch, -side * rail.splay, 0)
    box(side * grip.center.x, grip.center.y, grip.center.z, ...grip.size, grip.color, frame).rotation.copyFrom(handle.rotation)
    box(side * axleStrut.center[0], axleStrut.center[1], axleStrut.center[2], ...axleStrut.size, axleStrut.color, frame).rotation.z = -side * axleStrut.splay
    box(side * leg.x, leg.y, barrowFeet.z, ...leg.size, leg.color, frame).rotation.z = side * leg.splay
    box(side * legBrace.center[0], legBrace.center[1], legBrace.center[2], ...legBrace.size, legBrace.color, frame).rotation.x = legBrace.pitch
    box(side * barrowFeet.halfWidth, footPad.y, barrowFeet.z, ...footPad.size, footPad.color, frame)
  }
  box(0, crossBrace.y, crossBrace.z, ...crossBrace.size, crossBrace.color, frame)

  const carrots = packedCarrotSlots.map(({ center: [x, y, z], heading, scale }) => {
    const carrot = new TransformNode('Packed carrot', scene)
    carrot.parent = frame
    carrot.position.set(x, y, z)
    carrot.rotation.y = heading
    carrot.scaling.setAll(scale)
    buildHarvestedCarrot(meshes, carrot)
    carrot.setEnabled(false)
    return { carrot, y }
  })
  root.setEnabled(false)
  return { root, tilt, wheel, carrots }
}
