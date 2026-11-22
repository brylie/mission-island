import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { exteriorCanopy, exteriorEmblems, exteriorEntrances, exteriorRoof, exteriorShell, exteriorTower, exteriorWindows } from '../assets/geometry/saltwind-exteriors'
import { createSaltwindWindow, saltwindWindowRow } from '../assets/saltwind-window'
import type { MeshFactory } from '../island-meshes'
import { streetCanopy } from './lots'
import type { Exterior } from './lots'

const cream = '#f8e2b9', glass = '#426e73', shade = '#624e42', plank = '#926f55'
const half = 0.5
const sides = [-1, 1] as const
const stripePeriod = 2

type Triple = readonly [number, number, number]
type Box = (center: Triple, size: Triple, color: string) => ReturnType<MeshFactory['box']>
type ServiceBay = { width: number, height: number, count: number, slatted: boolean }

const serviceBays: Partial<Record<Exterior['kind'], ServiceBay>> = exteriorEntrances.bays

export function createExterior(meshes: MeshFactory, building: Exterior, foundation: number = exteriorShell.foundation.defaultDepth, parts: { roof?: 'flat' | 'gable', canopy?: boolean, tower?: 'school' | 'fire' | 'church' | 'none' } = {}) {
  const root = new TransformNode(building.kind, meshes.scene)
  const { width: w, height: h, depth: d, kind, wall } = building
  const box: Box = (center, size, color) => meshes.box(...center, ...size, color, root)
  const eave = d * half
  const flat = parts.roof ? parts.roof === 'flat' : ['hospital', 'apartments', 'police', 'mine'].includes(kind)
  const { foundation: footing, plinth, wallBase } = exteriorShell
  box([0, footing.centerY - foundation * half, 0], [w + footing.edgeAllowance, foundation + footing.aboveGround, d + footing.edgeAllowance], footing.finish)
  box([0, h * half + wallBase, 0], [w, h, d], wall)
  box([0, plinth.centerY, 0], [w + plinth.edgeAllowance, plinth.height, d + plinth.edgeAllowance], cream)
  buildRoof(meshes, root, box, building, eave, flat)

  const bays = serviceBays[kind]
  if (bays) buildServiceBays(box, building, eave, bays)
  else buildEntrance(box, kind, eave)
  addWindows(meshes, root, box, building, eave, Boolean(bays))
  if (parts.tower !== 'none') createTower(meshes, root, box, building, parts.tower ?? kind)
  if (parts.canopy ?? (kind === 'market' || kind === 'shop')) addStreetCanopy(meshes, root, box, building, eave)
  addServiceEmblem(meshes, root, box, building, eave)
  return root
}

function buildRoof(meshes: MeshFactory, root: TransformNode, box: Box, building: Exterior, eave: number, flat: boolean) {
  const { width: w, height: h, depth: d, roof, wall } = building
  if (flat) {
    const { plate, vent } = exteriorRoof.flat
    box([0, h + plate.aboveWall, 0], [w + plate.overhang, plate.thickness, d + plate.overhang], roof)
    box([-w * vent.xFraction, h + vent.aboveWall, -d * vent.zFraction], vent.size, vent.finish)
    return
  }
  const { maxRise, pitchRatio, eaveOverhang, panel, fascia, endFaces } = exteriorRoof.gable
  const rise = Math.min(maxRise, d * pitchRatio)
  const roofSpan = eave + eaveOverhang
  const tilt = Math.atan2(rise, roofSpan)
  for (const side of sides) {
    box(
      [0, h + panel.aboveWall + rise * half, side * roofSpan * half],
      [w + panel.widthAllowance, panel.thickness, Math.hypot(roofSpan, rise) + panel.edgeAllowance],
      roof,
    ).rotation.x = side * tilt
    box(
      [side * (w * half - fascia.inset), h + fascia.aboveWall + rise * fascia.centerRiseRatio, 0],
      [fascia.width, rise * fascia.heightRatio, d * fascia.depthRatio],
      wall,
    )
  }
  const halfWidth = w * half
  const eaveHeight = h + endFaces.aboveWall
  const crestHeight = eaveHeight + rise
  const vertices = [
    [-halfWidth, eaveHeight, -eave],
    [-halfWidth, crestHeight, 0],
    [-halfWidth, eaveHeight, eave],
    [halfWidth, eaveHeight, -eave],
    [halfWidth, crestHeight, 0],
    [halfWidth, eaveHeight, eave],
  ].flat()
  const gables = meshes.surface('Gable ends', vertices, [...endFaces.indices], wall, root, [...endFaces.uvs])
  gables.receiveShadows = true
}

function buildServiceBays(box: Box, { roof }: Exterior, eave: number, { count, width, height, slatted }: ServiceBay) {
  const { bayGap, frame, door, slats, sill } = exteriorEntrances.garage
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) * half) * (width + bayGap)
    box([x, height * half + frame.rise, eave + frame.forward], [width + frame.widthAllowance, height + frame.heightAllowance, frame.depth], cream)
    box([x, height * half + door.rise, eave + door.forward], [width, height, door.depth], slatted ? roof : door.portalFinish)
    if (slatted) {
      for (let row = 1; row < slats.rows; row++) {
        box([x, slats.baseY + row * height / slats.rows, eave + slats.forward], [width - slats.widthInset, slats.height, slats.depth], slats.finish)
      }
    }
    box([x, sill.centerY, eave + sill.forward], [width + sill.widthAllowance, sill.height, sill.depth], exteriorShell.foundation.finish)
  }
}

function buildEntrance(box: Box, kind: Exterior['kind'], eave: number) {
  const { wide, standard, frame, door, steps, stepWidthAllowance } = exteriorEntrances.pedestrian
  const width = kind === 'hospital' || kind === 'market' || kind === 'school' ? wide : standard
  box([0, frame.y, eave + frame.forward], [width + frame.widthAllowance, frame.height, frame.depth], cream)
  box([0, door.y, eave + door.forward], [width, door.height, door.depth], kind === 'church' ? plank : glass)
  for (const { y, forward, height, depth, finish } of steps) box([0, y, eave + forward], [width + stepWidthAllowance, height, depth], finish)
}

function addWindows(meshes: MeshFactory, root: TransformNode, box: Box, building: Exterior, eave: number, serviceEntrance: boolean) {
  const { width: w, height: h, depth: d, kind } = building
  const { floors, floorClearance, extraFront, flank } = exteriorWindows
  const storeys = kind === 'apartments' ? floors.apartments : kind === 'hospital' ? floors.hospital : floors.standard
  const { frame, pane } = flank
  for (const side of sides) {
    for (let floor = 0; floor < storeys; floor++) {
      const y = saltwindWindowRow.centreY + floor * (h - floorClearance) / storeys
      createSaltwindWindow(meshes, root, side * w * saltwindWindowRow.edgeFraction, y, eave)
      if (w > extraFront.minimumWidth && !serviceEntrance) createSaltwindWindow(meshes, root, side * w * extraFront.widthFraction, y, eave)
    }
    for (const ratio of flank.positions) {
      const z = ratio ? d * ratio : 0
      box([side * (w * half + frame.outside), frame.y, z], frame.size, cream)
      box([side * (w * half + pane.outside), pane.y, z], pane.size, glass)
    }
  }
}

function addStreetCanopy(meshes: MeshFactory, root: TransformNode, box: Box, building: Exterior, eave: number) {
  const awning = building.width * streetCanopy.widthRatio
  const depth = streetCanopy.depth
  const { fabric, props, counter } = exteriorCanopy
  for (let i = 0; i < fabric.count; i++) {
    const x = ((i + half) / fabric.count - half) * awning
    box([x, streetCanopy.height, eave + depth * half], [awning / fabric.count, fabric.thickness, depth], i % stripePeriod ? cream : building.roof).rotation.x = fabric.rake
  }
  for (const side of sides) box([side * (awning * half - props.sideInset), props.y, eave + depth - props.eaveInset], props.size, plank)
  if (building.kind !== 'market' || building.site === 'fish-market') return
  const { body, top, xFraction, forward } = counter
  for (const side of sides) {
    const x = side * awning * xFraction, z = eave + forward
    box([x, body.y, z], [awning * body.widthFraction, body.height, body.depth], body.finish)
    box([x, top.y, z], [awning * top.widthFraction, top.height, top.depth], top.finish)
    stockMarketCounter(meshes, root, box, x, z)
  }
}

function stockMarketCounter(meshes: MeshFactory, root: TransformNode, box: Box, x: number, z: number) {
  const { tray, rail, fruit } = exteriorCanopy.counter
  box([x, tray.y, z], tray.size, tray.finish)
  for (const side of sides) box([x, rail.y, z + side * rail.z], rail.size, rail.finish)
  for (const offset of fruit.x) {
    for (const side of sides) meshes.sphere(x + offset, fruit.y, z + side * fruit.z, ...fruit.size, offset === 0 ? fruit.greens : fruit.orange, root, true, fruit.segments)
  }
}

function addServiceEmblem(meshes: MeshFactory, root: TransformNode, box: Box, building: Exterior, eave: number) {
  const { kind, height } = building
  if (kind !== 'hospital' && kind !== 'police' && kind !== 'fire') return
  const { plaque, medical, police, fire } = exteriorEmblems
  const z = eave + plaque.forward, y = height - plaque.belowWall
  box([0, y, z], plaque.size, cream)
  if (kind === 'hospital') {
    const { crossbar, upright, finish } = medical
    box([0, y, z + crossbar.forward], crossbar.size, finish)
    box([0, y, z + upright.forward], upright.size, finish)
  }
  else if (kind === 'police') {
    const { shield, bar } = police
    meshes.cylinder(0, y, z + shield.forward, shield.diameter, shield.diameter, shield.height, shield.sides, shield.finish, root).rotation.x = shield.pitch
    box([0, y, z + bar.forward], bar.size, cream)
  }
  else {
    const { handle, head, separation, finish } = fire
    for (const side of sides) {
      box([side * handle.x, y, z + handle.forward + side * separation], handle.size, finish).rotation.z = side * handle.rake
      box([side * head.x, y + head.rise, z + head.forward + side * separation], head.size, finish).rotation.z = side * head.rake
    }
  }
}

function createTower(meshes: MeshFactory, root: TransformNode, box: Box, building: Exterior, kind: Exterior['kind']) {
  if (kind !== 'church' && kind !== 'fire' && kind !== 'school') return
  const { width: w, height: h, depth: d, wall, roof } = building
  const { silhouettes, fireOffset, base, spire, finial, crossbar, flag } = exteriorTower
  const layout = silhouettes[kind]
  const x = kind === 'fire' ? -w * fireOffset : 0
  const y = h + layout.rise
  const z = d * layout.depthFraction
  box([x, y - base.drop, z], [layout.width, base.height, layout.width], wall)
  meshes.cylinder(x, y + spire.rise, z, spire.topDiameter, layout.width * spire.baseWidthRatio, spire.height, spire.sides, roof, root).rotation.y = spire.heading
  box([x, y + finial.rise, z], finial.size, shade)
  if (kind === 'church') box([x, y + crossbar.rise, z], crossbar.size, shade)
  if (kind === 'school') box([x + flag.x, y + flag.rise, z], flag.size, flag.finish)
}
