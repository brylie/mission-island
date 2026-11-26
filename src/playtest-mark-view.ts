import '@babylonjs/core/Culling/ray'
// Adds `thinInstanceEnablePicking` to meshes; without it the toggle below is silently ignored.
import '@babylonjs/core/Meshes/thinInstanceMesh'
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { crewNodeName } from './assets/crew'
import { partAt, roundPoint, type MarkTarget, type MergedPart } from './playtest-mark'

// The Babylon half of a playtest mark: what the reticle is on, and a frame of the canvas.
// The reticle sits at the middle of the canvas, so the pick follows the camera's centre ray.

const jpegQuality = 0.85
const half = 0.5
// A plain toDataURL between frames reads a cleared WebGL buffer; read it just after a render instead.
const screenshotTimeoutMs = 500

// Effects you see through rather than things: the sky dome, the rain and camera-facing billboards
// such as mist. Most real scenery is not `isPickable` (that flag is for gameplay picks), so the
// mark keeps everything else, the ground, roads, trees and water included.
// Matched by name: the sky and rain meshes in island-atmosphere.ts. Rename them together.
const seeThrough = new Set(['Atmospheric sky', 'Rain'])

function parentNames(mesh: AbstractMesh) {
  const names: string[] = []
  for (let node = mesh.parent; node; node = node.parent) names.push(node.name)
  return names
}

// Only plain values from mesh metadata travel with a mark; merged part lists are summarised as `part`.
function plainMetadata(metadata: unknown) {
  if (typeof metadata !== 'object' || metadata === null) return
  const plain = Object.entries(metadata).filter(([key, value]) => key !== 'mergedFrom' && ['string', 'number', 'boolean'].includes(typeof value))
  return plain.length ? Object.fromEntries(plain) : undefined
}

function visible(mesh: AbstractMesh) {
  return mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && !mesh.name.startsWith('Debug overlay')
    && !seeThrough.has(mesh.name) && mesh.billboardMode === AbstractMesh.BILLBOARDMODE_NONE
}

interface Orbit { target: number[], alpha: number, beta: number, radius: number, fov: number }
// The dev view's fixed camera and sky (`devcam=`, `devsky=`), when the page has them.
interface DevView { camera?: ArcRotateCamera, weather?: { hour: number, rain: number } }

export function createMarkView(scene: Scene, dev?: DevView) {
  const engine = scene.getEngine()
  const view = {
    // The first visible surface under the reticle, past the player's own crew member.
    aim(viewer: number): MarkTarget | undefined {
      // The dev camera, when there is one, is the view even before a frame has made it active.
      const camera = dev?.camera ?? scene.activeCamera
      if (!camera) return
      const ray = scene.createPickingRay(engine.getRenderWidth() * half, engine.getRenderHeight() * half, Matrix.Identity(), camera)
      const own = crewNodeName(viewer)
      // Forest and ground cover are thin instances, which a pick skips unless asked; ask for this one pick.
      const instanced = scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.hasThinInstances && !mesh.thinInstanceEnablePicking)
      for (const mesh of instanced) mesh.thinInstanceEnablePicking = true
      const picked = scene.multiPickWithRay(ray, visible) ?? []
      for (const mesh of instanced) mesh.thinInstanceEnablePicking = false
      const hits = picked
        .filter((hit) => hit.hit && hit.pickedMesh && hit.pickedPoint && !parentNames(hit.pickedMesh).includes(own))
        .sort((a, b) => a.distance - b.distance)
      const hit = hits[0]
      if (!hit?.pickedMesh || !hit.pickedPoint) return
      const mesh = hit.pickedMesh
      const point = roundPoint({ x: hit.pickedPoint.x, y: hit.pickedPoint.y, z: hit.pickedPoint.z })
      const metadata: unknown = mesh.metadata
      const parts = typeof metadata === 'object' && metadata !== null && 'mergedFrom' in metadata ? metadata.mergedFrom as MergedPart[] : undefined
      const part = parts && partAt(parts, hit.faceId)
      return {
        point,
        distance: Number(hit.distance.toFixed(1)),
        mesh: mesh.name,
        parents: parentNames(mesh),
        ...(mesh.material && { material: mesh.material.name }),
        ...(part && { part: { name: part.name, parents: part.parents } }),
        ...(hit.thinInstanceIndex >= 0 && { thinInstance: hit.thinInstanceIndex }),
        ...(plainMetadata(metadata) && { metadata: plainMetadata(metadata) }),
      }
    },
    // What a mark records from the scene. A fixed dev camera draws the view, so the mark
    // describes it, and its sky, rather than the follow camera and the host's weather.
    read(viewer: number, follow: Orbit | undefined, clock: number) {
      const fixed = dev?.camera
      const camera = fixed ? { target: fixed.target.asArray(), alpha: fixed.alpha, beta: fixed.beta, radius: fixed.radius, fov: fixed.fov } : follow
      // `fixed` tells the page the player's reticle is not on this view.
      return { target: view.aim(viewer), camera, clock, weather: dev?.weather, fixed: Boolean(fixed), screenshot: view.screenshot() }
    },
    // A JPEG of the 3D view without the HUD, taken right after the next frame renders.
    screenshot() {
      const canvas = engine.getRenderingCanvas()
      return new Promise<string>((resolve, reject) => {
        if (!canvas) {
          reject(new Error('No canvas to capture.'))
          return
        }
        const grab = () => canvas.toDataURL('image/jpeg', jpegQuality)
        const observer = scene.onAfterRenderObservable.addOnce(() => {
          clearTimeout(timer)
          resolve(grab())
        })
        // A hidden tab draws no frames, so a scripted mark renders one itself and reads it in the same task.
        const timer = setTimeout(() => {
          scene.onAfterRenderObservable.remove(observer)
          try {
            scene.render()
            resolve(grab())
          }
          catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)))
          }
        }, screenshotTimeoutMs)
      })
    },
  }
  return view
}
