import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { Scene } from '@babylonjs/core/scene'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { overlayLift, overlayQuad, overlayRefresh } from './assets/recipes/debug-overlays'
import { debugOverlays } from './debug-overlays/catalog'
import type { OverlayContext, OverlayPrimitive } from './debug-overlays/registry'
import { ring } from './debug-overlays/world-layers'
import { groundHeight } from './terrain'

const half = 0.5
const coordinatesPerVertex = 3
const cellAlpha = 0.55
const overlayRenderingGroup = 3

function lift(point: { x: number, z: number }, height: number) {
  return new Vector3(point.x, groundHeight(point) + height, point.z)
}

// One line system and one cell mesh per layer, so a layer costs at most two draw calls.
function buildLayerMeshes(scene: Scene, id: string, primitives: readonly OverlayPrimitive[]) {
  const lines: Vector3[][] = [], colors: Color4[][] = []
  const positions: number[] = [], vertexColors: number[] = [], indices: number[] = []
  for (const primitive of primitives) {
    if (primitive.kind === 'cell') {
      const base = positions.length / coordinatesPerVertex
      const color = Color4.FromColor3(Color3.FromHexString(primitive.color), cellAlpha)
      for (const [u, v] of overlayQuad.corners) {
        const point = { x: primitive.x + u * primitive.size * half, z: primitive.z + v * primitive.size * half }
        positions.push(point.x, groundHeight(point) + overlayLift.ground, point.z)
        vertexColors.push(color.r, color.g, color.b, color.a)
      }
      indices.push(...overlayQuad.indices.map((index) => base + index))
      continue
    }
    const points = primitive.kind === 'ring' ? ring(primitive, primitive.radius) : primitive.points
    const closed = primitive.kind === 'ring' || primitive.closed
    const height = primitive.lift ?? (primitive.kind === 'ring' ? overlayLift.marker : overlayLift.line)
    const path = [...points, ...(closed && points.length ? [points[0]] : [])].map((point) => lift(point, height))
    const color = Color4.FromColor3(Color3.FromHexString(primitive.color))
    lines.push(path)
    colors.push(path.map(() => color))
  }
  const meshes: Mesh[] = []
  if (lines.length) {
    const system = CreateLineSystem(`Debug overlay ${id} lines`, { lines, colors }, scene)
    system.isPickable = false
    meshes.push(system)
  }
  if (indices.length) {
    const cells = new Mesh(`Debug overlay ${id} cells`, scene)
    Object.assign(new VertexData(), { positions, indices, colors: vertexColors }).applyToMesh(cells)
    const material = new StandardMaterial(`Debug overlay ${id} material`, scene)
    Object.assign(material, { disableLighting: true, emissiveColor: Color3.White(), backFaceCulling: false, alpha: cellAlpha })
    cells.hasVertexAlpha = true
    cells.useVertexColors = true
    cells.material = material
    cells.isPickable = false
    meshes.push(cells)
  }
  for (const mesh of meshes) mesh.renderingGroupId = overlayRenderingGroup
  return meshes
}

// Shows the chosen overlay layers. Static layers build once; live layers rebuild each update.
export function createDebugOverlayView(scene: Scene) {
  const shown = new Map<string, { sample: (context: OverlayContext) => OverlayPrimitive[], live: boolean, meshes: Mesh[], sampledAt: number }>()
  const clear = (meshes: Mesh[]) => meshes.forEach((mesh) => void mesh.dispose(false, true))
  scene.setRenderingAutoClearDepthStencil(overlayRenderingGroup, false)

  function set(ids: readonly string[]) {
    for (const [id, layer] of shown) {
      if (ids.includes(id)) continue
      clear(layer.meshes)
      shown.delete(id)
    }
    for (const id of ids) {
      const layer = debugOverlays.get(id)
      if (layer && !shown.has(id)) shown.set(id, { sample: layer.create(), live: layer.live, meshes: [], sampledAt: -Infinity })
    }
  }

  // Live layers resample a few times a second rather than every frame, to keep the overlay cheap.
  function update(context: OverlayContext, seconds: number) {
    for (const [id, layer] of shown) {
      if (layer.live ? seconds - layer.sampledAt < overlayRefresh.liveSeconds : layer.meshes.length) continue
      layer.sampledAt = seconds
      clear(layer.meshes)
      layer.meshes = buildLayerMeshes(scene, id, layer.sample(context))
    }
  }

  return {
    set,
    update,
    toggle(id: string) { set(shown.has(id) ? [...shown.keys()].filter((key) => key !== id) : [...shown.keys(), id]) },
    shown: () => [...shown.keys()],
    dispose() { set([]) },
  }
}
