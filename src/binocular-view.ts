import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Constants } from '@babylonjs/core/Engines/constants'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder'
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { playerColors } from './assets/crew'
import { crewMarkBeacon as look } from './assets/geometry/crew-mark'
import { followFieldOfView } from './island-camera'
import type { MeshFactory } from './island-meshes'
import { createIslandMaterial } from './materials'
import type { Player, Snapshot } from './protocol'
import { binocularEyeHeightM, binocularMagnification } from './spotting'
import { distance, localPoint } from './world'
import { fireWatch, onFireWatchDeck } from './fire-watch'
import { fireWatchGeometry } from './assets/geometry/fire-watch'
import { fireWatchBaseHeight } from './terrain'

export interface BinocularLook {
  // Compass heading of the view in radians, clockwise from north (+z).
  yaw: number
  // Radians above the horizon.
  pitch: number
}

const half = 0.5
const positionComponents = 3
// Magnifying by eight shrinks the tangent of the half-angle of view eight times: about 7° across, as real 8× binoculars see.
export const binocularFieldOfView = Math.atan(Math.tan(followFieldOfView * half) / binocularMagnification) / half
// The lenses sit just in front of the face, so the crewmate's own head stays behind the view.
const lensForwardM = 0.3
const nearPlaneM = 0.12
// The cab's posts and rails stand this far outside the deck edge; the near plane never reaches past this, so the ground stays.
const cabWallClearanceM = 0.3
const cabNearPlaneLimitM = 5
const parallelTolerance = 1e-6
const farPlaneM = 1000
// Haze thins out this much while viewing, so far ground stays readable. Real binoculars cannot see through haze;
// this is a deliberate game choice recorded in the Fire Watch docs.
const viewingFogScale = 2

export function lookDirection({ yaw, pitch }: BinocularLook) {
  return { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) }
}

// The eye point the binoculars look out from, for a crewmate standing at `feet`.
export function binocularEye(feet: { x: number, y: number, z: number }, view: BinocularLook) {
  const ahead = lookDirection(view)
  return { x: feet.x + ahead.x * lensForwardM, y: feet.y + binocularEyeHeightM + ahead.y * lensForwardM, z: feet.z + ahead.z * lensForwardM }
}

type ColumnLook = typeof look.core | typeof look.halo

function createColumn({ scene }: MeshFactory, color: string, part: ColumnLook, additive: boolean) {
  const { height, rows, segments } = look
  const column = CreateCylinder('Crew mark column', { height, diameterBottom: part.diameterBottom, diameterTop: part.diameterTop, cap: 0, tessellation: segments, subdivisions: rows }, scene)
  const tint = Color3.FromHexString(color).scale(part.shade)
  const vertices = column.getVerticesData(VertexBuffer.PositionKind) ?? []
  const colors: number[] = []
  for (let i = 1; i < vertices.length; i += positionComponents) {
    const rise = vertices[i] / height + half
    colors.push(tint.r, tint.g, tint.b, part.opacity * (1 - rise) ** part.fadePower)
  }
  column.setVerticesData(VertexBuffer.ColorKind, colors)
  column.hasVertexAlpha = true
  column.alphaIndex = part.alphaIndex
  column.position.y = height * half
  const material = createIslandMaterial(scene, 'Crew mark light', '#ffffff')
  material.disableLighting = true
  material.emissiveColor = Color3.White()
  material.backFaceCulling = false
  if (additive) material.alphaMode = Constants.ALPHA_ADD
  column.material = material
  return column
}

function createBeacon(meshes: MeshFactory, color: string) {
  const root = new TransformNode('Crew mark', meshes.scene)
  const ring = CreateTorus('Crew mark ring', { diameter: look.ring.diameter, thickness: look.ring.thickness, tessellation: look.ring.segments }, meshes.scene)
  ring.material = meshes.paint(color, true)
  ring.position.y = look.ring.lift
  for (const mesh of [ring, createColumn(meshes, color, look.core, false), createColumn(meshes, color, look.halo, true)]) {
    mesh.isPickable = false
    mesh.parent = root
  }
  return root
}

// From inside the Fire Watch cab, the near plane sits just past the cab's walls along the view, so the window posts
// and rails never cover the field. Elsewhere it is the usual close near plane.
function nearPlane(subject: TransformNode, eye: { x: number, y: number, z: number }, ahead: { x: number, z: number }) {
  if (!onFireWatchDeck({ x: subject.position.x, y: subject.position.y, z: subject.position.z }, fireWatchBaseHeight())) return nearPlaneM
  const local = localPoint(fireWatch, eye)
  const forward = localPoint({ ...fireWatch, x: 0, z: 0 }, ahead)
  const wall = fireWatchGeometry.deck.area[1] + cabWallClearanceM
  const exits = [[local.x, forward.x], [local.z, forward.z]].flatMap(([from, step]) => Math.abs(step) > parallelTolerance ? [(Math.sign(step) * wall - from) / step] : [])
  return Math.min(cabNearPlaneLimitM, Math.max(nearPlaneM, ...exits.length ? [Math.min(...exits)] : []))
}

// The binocular camera and every crewmate's mark: a beacon in their crew colour and a tag with their name and distance.
export function createBinocularView(meshes: MeshFactory, markers: HTMLElement) {
  const camera = new FreeCamera('Binoculars', Vector3.Zero(), meshes.scene)
  camera.fov = binocularFieldOfView
  camera.minZ = nearPlaneM
  camera.maxZ = farPlaneM
  const beacons = new Map<number, TransformNode>()
  const tags = new Map<number, HTMLElement>()
  let viewing = false

  function tag(playerId: number) {
    let element = tags.get(playerId)
    if (!element) {
      element = document.createElement('div')
      element.className = 'crew-mark-tag'
      element.style.setProperty('--crew-color', playerColors[playerId % playerColors.length])
      markers.append(element)
      tags.set(playerId, element)
    }
    return element
  }

  return {
    // The camera to draw through while the binoculars are up, from the crewmate's eyes along their view.
    // The binocular state is read every frame, even when another view wins, so the binoculars can lower themselves.
    frame({ local, subject, review }: { local?: Player, subject?: TransformNode, review?: unknown }, binoculars?: (drawn?: Vector3) => BinocularLook | undefined) {
      const view = binoculars?.(subject?.position)
      viewing = Boolean(local && !local.seat && subject && view && !review)
      if (!viewing || !subject || !view) return undefined
      const eye = binocularEye(subject.position, view)
      const ahead = lookDirection(view)
      camera.position.set(eye.x, eye.y, eye.z)
      camera.setTarget(new Vector3(eye.x + ahead.x, eye.y + ahead.y, eye.z + ahead.z))
      camera.minZ = nearPlane(subject, eye, ahead)
      meshes.scene.activeCamera = camera
      return camera
    },
    fogScale: () => viewing ? viewingFogScale : 1,
    // Beacons and tags follow the snapshot. A tag reads the distance from whoever is looking.
    show(state: Snapshot | undefined, local: Player | undefined, locate: (element: HTMLElement, x: number, y: number, z: number) => void) {
      const marks = state?.marks ?? []
      for (const [playerId, beacon] of beacons) beacon.setEnabled(marks.some((mark) => mark.playerId === playerId))
      for (const [playerId, element] of tags) element.hidden = !marks.some((mark) => mark.playerId === playerId)
      for (const mark of marks) {
        let beacon = beacons.get(mark.playerId)
        if (!beacon) {
          beacon = createBeacon(meshes, playerColors[mark.playerId % playerColors.length])
          beacons.set(mark.playerId, beacon)
        }
        beacon.position.set(mark.x, mark.y, mark.z)
        const element = tag(mark.playerId)
        const name = state?.players.find((player) => player.id === mark.playerId)?.name || `Crew ${mark.playerId + 1}`
        const text = local ? `${name} · ${Math.round(distance(local, mark))} m` : name
        if (element.textContent !== text) element.textContent = text
        locate(element, mark.x, mark.y + look.labelRise, mark.z)
      }
    },
  }
}
