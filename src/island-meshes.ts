import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { Scene } from '@babylonjs/core/scene'
import { createIslandMaterial, createSurfaceMaterial } from './materials'
import type { SurfaceName } from './materials'

export function createIslandLighting(scene: Scene) {
  const sunlight = new DirectionalLight('Afternoon sun', new Vector3(0.55, -1, 0.6), scene)
  // The Atmosphere material plugin uses the sun as the first light.
  sunlight.renderPriority = 1
  sunlight.position.set(-48, 86, -55)
  sunlight.intensity = 0.86
  sunlight.diffuse = Color3.FromHexString('#fff3d7')
  sunlight.shadowMinZ = 1
  sunlight.shadowMaxZ = 220
  const shadows = new ShadowGenerator(1536, sunlight)
  shadows.usePercentageCloserFiltering = true
  shadows.bias = 0.0008
  shadows.normalBias = 0.045
  shadows.setDarkness(0.22)

  const sky = new HemisphericLight('Sky fill', new Vector3(0.1, 1, -0.35), scene)
  sky.intensity = 0.58
  sky.groundColor = Color3.FromHexString('#8aaba1')

  return { sky, sunlight, shadows }
}

export function createMeshFactory(scene: Scene, shadows: ShadowGenerator) {
  const materials = new Map<string, Material>()
  const batches = new Map<Material, Mesh[]>()
  const noShadow: Mesh[] = []
  function paint(color: string, glow = false) {
    const key = String(glow) + color
    const existing = materials.get(key)
    if (existing) return existing
    const material = createIslandMaterial(scene, key, color, glow)
    materials.set(key, material)
    return material
  }

  function paintSurface(surface: SurfaceName, color?: string) {
    const key = surface + (color ?? '')
    const existing = materials.get(key)
    if (existing) return existing
    const material = createSurfaceMaterial(scene, surface, color)
    materials.set(key, material)
    return material
  }

  function place(mesh: Mesh, x: number, y: number, z: number, color: string | Material,
    root?: TransformNode, casts = true) {
    mesh.position.set(x, y, z)
    const material = typeof color === 'string' ? paint(color) : color
    mesh.material = material
    mesh.isPickable = false
    if (root) {
      mesh.parent = root
      if (casts) shadows.addShadowCaster(mesh, false)
    } else if (casts) {
      const batch = batches.get(material) ?? []
      batch.push(mesh)
      batches.set(material, batch)
    } else {
      noShadow.push(mesh)
    }
    return mesh
  }

  function box(x: number, y: number, z: number, width: number, height: number, depth: number,
    color: string | Material, root?: TransformNode, casts = true) {
    return place(CreateBox('Box', { width, height, depth }, scene), x, y, z, color, root, casts)
  }

  function sphere(x: number, y: number, z: number, width: number, height: number, depth: number,
    color: string | Material, root?: TransformNode, casts = true, segments = 6) {
    const mesh = CreateSphere('Sphere', { diameter: 1, segments }, scene)
    mesh.scaling.set(width, height, depth)
    return place(mesh, x, y, z, color, root, casts)
  }

  function cylinder(x: number, y: number, z: number, top: number, bottom: number, height: number,
    sides: number, color: string | Material, root?: TransformNode) {
    const mesh = CreateCylinder('Cylinder', { diameterTop: top, diameterBottom: bottom, height, tessellation: sides }, scene)
    return place(mesh, x, y, z, color, root)
  }

  function surface(name: string, positions: number[], indices: number[], color: string | Material, root?: TransformNode, uvs?: number[]) {
    const mesh = new Mesh(name, scene)
    const data = new VertexData()
    data.positions = positions
    data.indices = indices
    data.uvs = uvs ?? null
    data.normals = []
    VertexData.ComputeNormals(positions, indices, data.normals)
    data.applyToMesh(mesh)
    mesh.material = typeof color === 'string' ? paint(color) : color
    mesh.isPickable = false
    mesh.parent = root ?? null
    mesh.receiveShadows = true
    return mesh
  }

  function batchModel(root: TransformNode) {
    for (const mesh of root.getChildMeshes()) {
      // The procedural gables have no UV buffer and cannot join the box batches.
      if (!(mesh instanceof Mesh) || !mesh.isVerticesDataPresent(VertexBuffer.UVKind)) continue
      const material = mesh.material as Material
      const group = batches.get(material) ?? []
      group.push(mesh)
      batches.set(material, group)
      shadows.removeShadowCaster(mesh, false)
    }
  }

  function finishScenery({ merge = true } = {}) {
    if (!merge) {
      for (const meshes of batches.values()) {
        for (const mesh of meshes) {
          mesh.receiveShadows = true
          shadows.addShadowCaster(mesh, false)
        }
      }
      for (const mesh of noShadow) mesh.receiveShadows = true
      batches.clear()
      noShadow.length = 0
      return
    }
    for (const [material, meshes] of batches) {
      const batch = Mesh.MergeMeshes(meshes, true, true)
      if (!batch) continue
      batch.material = material
      batch.receiveShadows = true
      shadows.addShadowCaster(batch)
      batch.freezeWorldMatrix()
    }
    const flatMaterials = new Set(noShadow.map((mesh) => mesh.material))
    for (const material of flatMaterials) {
      const batch = Mesh.MergeMeshes(noShadow.filter((mesh) => mesh.material === material), true, true)
      if (!batch) continue
      batch.material = material
      batch.receiveShadows = true
      batch.freezeWorldMatrix()
    }
    batches.clear()
    noShadow.length = 0
  }

  return { scene, shadows, paint, paintSurface, box, sphere, cylinder, surface, batchModel, finishScenery }
}

export type MeshFactory = ReturnType<typeof createMeshFactory>
