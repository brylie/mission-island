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
import { distance } from './world'

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

function createBeacon({ scene, paint }: MeshFactory, color: string) {
  const root = new TransformNode('Crew mark', scene)
  const ring = CreateTorus('Crew mark ring', { diameter: look.ring.diameter, thickness: look.ring.thickness, tessellation: look.ring.segments }, scene)
  ring.material = paint(color, true)
  ring.position.y = look.ring.lift
  const { height, diameterBottom, diameterTop, segments, rows, opacity, fadePower, alphaIndex } = look.column
  const column = CreateCylinder('Crew mark column', { height, diameterBottom, diameterTop, cap: 0, tessellation: segments, subdivisions: rows }, scene)
  const tint = Color3.FromHexString(color)
  const vertices = column.getVerticesData(VertexBuffer.PositionKind) ?? []
  const colors: number[] = []
  for (let i = 1; i < vertices.length; i += positionComponents) {
    const rise = vertices[i] / height + half
    colors.push(tint.r, tint.g, tint.b, opacity * (1 - rise) ** fadePower)
  }
  column.setVerticesData(VertexBuffer.ColorKind, colors)
  column.hasVertexAlpha = true
  column.alphaIndex = alphaIndex
  column.position.y = height * half
  const glow = createIslandMaterial(scene, 'Crew mark glow', '#ffffff')
  glow.disableLighting = true
  glow.emissiveColor = Color3.White()
  glow.backFaceCulling = false
  glow.alpha = look.glowOpacity
  glow.alphaMode = Constants.ALPHA_ADD
  column.material = glow
  for (const mesh of [ring, column]) {
    mesh.isPickable = false
    mesh.parent = root
  }
  return root
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
    frame(local: Player | undefined, subject: TransformNode | undefined, binoculars?: () => BinocularLook | undefined) {
      const view = local && !local.seat ? binoculars?.() : undefined
      viewing = Boolean(subject && view)
      if (!subject || !view) return undefined
      const eye = binocularEye(subject.position, view)
      const ahead = lookDirection(view)
      camera.position.set(eye.x, eye.y, eye.z)
      camera.setTarget(new Vector3(eye.x + ahead.x, eye.y + ahead.y, eye.z + ahead.z))
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
