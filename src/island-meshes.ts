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
import { islandLightingPreset } from './assets/island-lighting'
import { createIslandMaterial, createRecipeMaterial, createSurfaceMaterial } from './materials'
import { surfaceRecipe, type SurfaceRecipe } from './assets/surface-recipes'
import type { SurfaceName } from './materials'

// The Atmosphere material plugin uses the sun as the first light.
const atmosphereSunlightPriority = 1
const defaultSphereSegments = 6

export function createIslandLighting(scene: Scene) {
  const { sun, skyFill, shadow } = islandLightingPreset
  const sunlight = new DirectionalLight(sun.name, new Vector3(...sun.direction), scene)
  sunlight.renderPriority = atmosphereSunlightPriority
  sunlight.position.set(...sun.position)
  sunlight.intensity = sun.intensity
  sunlight.diffuse = Color3.FromHexString(sun.diffuseColor)
  sunlight.shadowMinZ = shadow.minZ
  sunlight.shadowMaxZ = shadow.maxZ
  const shadows = new ShadowGenerator(shadow.mapSize, sunlight)
  shadows.usePercentageCloserFiltering = true
  shadows.bias = shadow.bias
  shadows.normalBias = shadow.normalBias
  shadows.setDarkness(shadow.darkness)

  const sky = new HemisphericLight(skyFill.name, new Vector3(...skyFill.direction), scene)
  sky.intensity = skyFill.intensity
  sky.groundColor = Color3.FromHexString(skyFill.groundColor)

  return { sky, sunlight, shadows }
}

export function createMeshFactory(scene: Scene, shadows: ShadowGenerator) {
  const materials = new Map<string, Material>()
  const recipes = new Map<SurfaceRecipe['id'], ReturnType<typeof createRecipeMaterial>>()
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

  function paintRecipe(id: SurfaceRecipe['id']) {
    const existing = recipes.get(id)
    if (existing) return existing
    const material = createRecipeMaterial(scene, surfaceRecipe(id))
    recipes.set(id, material)
    return material
  }

  function place(mesh: Mesh, x: number, y: number, z: number, color: string | Material, root?: TransformNode, casts = true) {
    mesh.position.set(x, y, z)
    const material = typeof color === 'string' ? paint(color) : color
    mesh.material = material
    mesh.isPickable = false
    if (root) {
      mesh.parent = root
      if (casts) shadows.addShadowCaster(mesh, false)
    }
    else if (casts) {
      const batch = batches.get(material) ?? []
      batch.push(mesh)
      batches.set(material, batch)
    }
    else {
      noShadow.push(mesh)
    }
    return mesh
  }

  function box(x: number, y: number, z: number, width: number, height: number, depth: number, color: string | Material, root?: TransformNode, casts = true) {
    return place(CreateBox('Box', { width, height, depth }, scene), x, y, z, color, root, casts)
  }

  function sphere(x: number, y: number, z: number, width: number, height: number, depth: number, color: string | Material, root?: TransformNode, casts = true, segments = defaultSphereSegments) {
    const mesh = CreateSphere('Sphere', { diameter: 1, segments }, scene)
    mesh.scaling.set(width, height, depth)
    return place(mesh, x, y, z, color, root, casts)
  }

  function cylinder(x: number, y: number, z: number, top: number, bottom: number, height: number, sides: number, color: string | Material, root?: TransformNode, casts = true) {
    const mesh = CreateCylinder('Cylinder', { diameterTop: top, diameterBottom: bottom, height, tessellation: sides }, scene)
    return place(mesh, x, y, z, color, root, casts)
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

  return { scene, shadows, paint, paintSurface, paintRecipe, box, sphere, cylinder, surface, batchModel, finishScenery }
}

export type MeshFactory = ReturnType<typeof createMeshFactory>
