import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import type { Material } from '@babylonjs/core/Materials/material'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial'
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer'
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine'
import type { Scene } from '@babylonjs/core/scene'
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh'
import type { MeshFactory } from './island-meshes'
import { environmentalMaterialPriority } from './assets/recipes/island-shader-presets'
import { meadowBladeGeometry } from './assets/geometry/meadow-blades'
import { createIslandMaterial } from './materials'
import { seededRandom } from './seeded-random'
import { meadowDefaults, patchNoise, type MeadowSettings } from './shader-studies'
import type { Point } from './world'

const componentsPerVertex = 3

const uniforms = 'uniform vec4 meadowControls; uniform vec3 meadowEye;'

class MeadowShader extends MaterialPluginBase {
  private time = 0
  private settings = meadowDefaults
  private eye?: Point & { y: number }
  private readonly pbr: boolean

  constructor(material: Material, private readonly blades: boolean) {
    super(material, blades ? 'Stem wind' : 'Meadow distance', environmentalMaterialPriority)
    this.pbr = material instanceof PBRMaterial
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
    return { externalUniforms: ['meadowControls', 'meadowEye'] }
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
        CUSTOM_VERTEX_DEFINITIONS: this.blades
          ? `${uniforms}
          attribute vec3 bladeRoot;
          varying vec2 stemXZ;
          ${patchNoise}`
          : '',
        CUSTOM_VERTEX_UPDATE_POSITION: this.blades
          ? `
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
          positionUpdated = bladeRoot + blade;`
          : '',
      }
    }
    const patchPoint = this.blades ? 'stemXZ' : 'vPositionW.xz'
    const color = this.pbr ? 'surfaceAlbedo' : 'baseColor.rgb'
    // A coarse mip keeps the recipe's own tint as the close grain fades.
    const farAlbedo = this.pbr
      ? `
      vec3 farAlbedo = vAlbedoColor.rgb;
      #ifdef ALBEDO
        vec3 coarseGrain = texture2D(albedoSampler, vAlbedoUV, 6.).rgb;
        #ifdef GAMMAALBEDO
          coarseGrain = toLinearSpace(coarseGrain);
        #endif
        farAlbedo *= coarseGrain * vAlbedoInfos.y;
      #endif`
      : 'vec3 farAlbedo = vec3(.88);'
    const terrain = this.blades
      ? ''
      : `
      float far = meadowFade(max(1., meadowControls.z), distance(meadowEye, vPositionW));
      ${farAlbedo}
      #ifdef VERTEXCOLOR
        farAlbedo *= vColor.rgb;
      #endif
      ${color} = mix(${color}, farAlbedo, far * .86);
      #ifdef NORMAL
        normalW = normalize(mix(normalW, normalize(vNormalW), far));
      #endif`
    const shading = `
      if (meadowControls.w > 0.) {
        ${terrain}
        float grassPatch = meadowPatch(${patchPoint});
        ${color} *= mix(vec3(1.05, .82, .59), vec3(.63, .99, 1.06), grassPatch)
          * (meadowControls.w * 1.7) + (1. - meadowControls.w * 1.7);
      }`
    return {
      // Both Babylon's uniform-buffer and standalone shader variants include this hook.
      CUSTOM_FRAGMENT_DEFINITIONS: `${uniforms}
        ${this.blades ? 'varying vec2 stemXZ;' : ''}
        ${patchNoise}`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: this.pbr ? shading : '',
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: this.pbr ? '' : shading,
    }
  }
}

export function createMeadowSurface(material: Material) {
  const shader = new MeadowShader(material, false)
  return shader.pose.bind(shader)
}

export function createMeadowBlades(meshes: MeshFactory, points: Iterable<Point>, heightAt: (point: Point) => number, seed: number) {
  const { color, bladesPerTuft, width: bladeWidth, height: bladeHeight, profile, triangles } = meadowBladeGeometry
  const material = createIslandMaterial(meshes.scene, 'Meadow blades', color)
  material.backFaceCulling = false
  material.twoSidedLighting = true
  const shader = new MeadowShader(material, true)
  const positions: number[] = [], roots: number[] = [], indices: number[] = []
  const random = seededRandom(seed)
  for (const point of points) {
    const { x, z } = point
    const y = heightAt(point)
    const angle = random() * Math.PI
    for (let k = 0; k < bladesPerTuft; k++) {
      const theta = angle + k * Math.PI / bladesPerTuft
      const width = bladeWidth.minimum + random() * bladeWidth.variation
      const height = bladeHeight.minimum + random() * bladeHeight.variation
      const dx = Math.cos(theta) * width, dz = Math.sin(theta) * width
      const base = positions.length / componentsPerVertex
      for (const [reach, rise] of profile) {
        positions.push(x + dx * reach, y + height * rise, z + dz * reach)
        roots.push(x, y, z)
      }
      for (const index of triangles) indices.push(base + index)
    }
  }
  const mesh = meshes.surface('Meadow blades', positions, indices, material)
  mesh.setVerticesData('bladeRoot', roots, false, componentsPerVertex)
  mesh.freezeWorldMatrix()
  return shader.pose.bind(shader)
}
