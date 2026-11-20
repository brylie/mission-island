import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine'
import type { Scene } from '@babylonjs/core/scene'
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh'
import type { MeshFactory } from './island-meshes'
import { createIslandMaterial } from './materials'
import { seededRandom } from './seeded-random'
import { meadowDefaults, patchNoise, type MeadowSettings } from './shader-studies'
import type { Point } from './world'

const uniforms = 'uniform vec4 meadowControls; uniform vec3 meadowEye;'

class MeadowShader extends MaterialPluginBase {
  private time = 0
  private settings = meadowDefaults
  private eye?: Point & { y: number }

  constructor(material: Material, private readonly blades: boolean) {
    super(material, blades ? 'Stem wind' : 'Meadow distance', 180)
    this.registerForExtraEvents = true
    this._enable(true)
  }

  pose(time: number, camera: Point & { y: number }, settings: MeadowSettings) {
    this.time = time
    this.eye = camera
    this.settings = settings
  }

  override getClassName() { return this.name }

  override getUniforms() {
    return { vertex: this.blades ? uniforms : '', fragment: uniforms, externalUniforms: ['meadowControls', 'meadowEye'] }
  }

  override getAttributes(attributes: string[]) {
    if (this.blades) attributes.push('bladeRoot')
  }

  override hardBindForSubMesh(_buffer: UniformBuffer, _scene: Scene, _engine: AbstractEngine, subMesh: SubMesh) {
    const { gust, grassDistance, patchContrast } = this.settings
    subMesh.effect?.setFloat4('meadowControls', this.time, gust, grassDistance, patchContrast)
    if (this.eye) subMesh.effect?.setFloat3('meadowEye', this.eye.x, this.eye.y, this.eye.z)
  }

  override getCustomCode(type: string): Record<string, string> {
    if (type === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: this.blades ? `attribute vec3 bladeRoot;
          varying vec2 stemXZ;
          ${patchNoise}` : '',
        CUSTOM_VERTEX_UPDATE_POSITION: this.blades ? `
          stemXZ = bladeRoot.xz;
          vec3 blade = positionUpdated - bladeRoot;
          float stemWeight = pow(max(0., blade.y), 2.) * 5.;
          if (meadowControls.y > 0.) {
            float gust = .44 + .56 * sin(dot(stemXZ, vec2(.37, .24)) - meadowControls.x * 2.7);
            float flutter = .20 * sin(dot(stemXZ, vec2(-.63, .92)) - meadowControls.x * 5.5);
            blade.xz += vec2(gust + flutter, gust * .53 - flutter) * stemWeight * meadowControls.y;
          }
          float limit = meadowControls.z;
          if (limit > 0.) blade *= 1. - meadowFade(limit, distance(meadowEye, bladeRoot));
          positionUpdated = bladeRoot + blade;` : '',
      }
    }
    const patchPoint = this.blades ? 'stemXZ' : 'vPositionW.xz'
    const terrain = this.blades ? '' : `
      float far = meadowFade(max(1., meadowControls.z), distance(meadowEye, vPositionW));
      #ifdef VERTEXCOLOR
        baseColor.rgb = mix(baseColor.rgb, vColor.rgb * .88, far * .86);
      #else
        baseColor.rgb = mix(baseColor.rgb, vec3(.88), far * .86);
      #endif
      #ifdef NORMAL
        normalW = normalize(mix(normalW, normalize(vNormalW), far));
      #endif`
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `${this.blades ? 'varying vec2 stemXZ;' : ''}
        ${patchNoise}`,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        if (meadowControls.w > 0.) {
          ${terrain}
          float grassPatch = meadowPatch(${patchPoint});
          baseColor.rgb *= mix(vec3(1.05, .82, .59), vec3(.63, .99, 1.06), grassPatch)
            * (meadowControls.w * 1.7) + (1. - meadowControls.w * 1.7);
        }`,
    }
  }
}

export function createMeadowSurface(material: Material) {
  const shader = new MeadowShader(material, false)
  return shader.pose.bind(shader)
}

export function createMeadowBlades(meshes: MeshFactory, points: Iterable<Point>, heightAt: (point: Point) => number, seed: number) {
  const material = createIslandMaterial(meshes.scene, 'Meadow blades', '#618752')
  material.backFaceCulling = false
  material.twoSidedLighting = true
  const shader = new MeadowShader(material, true)
  const positions: number[] = [], roots: number[] = [], indices: number[] = []
  const random = seededRandom(seed)
  for (const point of points) {
    const { x, z } = point
    const y = heightAt(point)
    const angle = random() * Math.PI
    for (let k = 0; k < 3; k++) {
      const theta = angle + k * Math.PI / 3
      const width = .058 + random() * .038
      const height = .20 + random() * .25
      const dx = Math.cos(theta) * width, dz = Math.sin(theta) * width
      const base = positions.length / 3
      positions.push(x - dx, y, z - dz, x + dx, y, z + dz,
        x, y + height * .52, z, x + dx * .93, y + height * .52, z + dz * .93,
        x + dx * 2.4, y + height, z + dz * 2.4)
      for (let i = 0; i < 5; i++) roots.push(x, y, z)
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4)
    }
  }
  const mesh = meshes.surface('Meadow blades', positions, indices, material)
  mesh.setVerticesData('bladeRoot', roots, false, 3)
  mesh.freezeWorldMatrix()
  return shader.pose.bind(shader)
}
