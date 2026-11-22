import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { mistLighting, phenomenonLooks, phenomenonPatch, phenomenonShader } from './assets/effects/phenomena'
import { seededRandom } from './seeded-random'
import { shaderPresets } from './shader-studies'
import { solarAngle } from './weather'
import type { WildlifeFrame } from './wildlife'
import { phenomenonStrength, smoothRange } from './wildlife-motion'

type Kind = keyof typeof phenomenonLooks
interface Effect {
  name: string
  kind: Kind
  x: number
  y: number
  z: number
  extent: number
  seed: number
  scatter?: boolean
}

const half = 0.5
const fullTurn = Math.PI + Math.PI
const patchAlphaIndex = 2
const reducedDensityGroupSize = 3
const omittedPatchIndex = 2
const visibilityExtentMultiplier = 2.5
const distanceFadeStart = 0.7
const minimumVisibleStrength = 0.01
const { mist: mistLook, spray: sprayLook, glow: glowLook } = phenomenonLooks

export function createPhenomena(scene: Scene, effects: readonly Effect[]) {
  const groups = effects.map((effect) => {
    const look = phenomenonLooks[effect.kind]
    const material = new ShaderMaterial(effect.name, scene, phenomenonShader, { attributes: ['position', 'uv'], uniforms: ['world', 'worldViewProjection', 'tint', 'opacity', 'mistEye', 'morningSun', 'scattering'], defines: effect.scatter ? ['#define LIT_MIST'] : [], needAlphaBlending: true })
    material.backFaceCulling = false
    material.setColor3('tint', Color3.FromHexString(look.tint))
    const random = seededRandom(effect.seed)
    const patches = Array.from({ length: look.count }, (_, index) => {
      const mesh = CreatePlane(effect.name, { size: 1 }, scene)
      mesh.isPickable = false
      mesh.material = material
      mesh.alphaIndex = patchAlphaIndex
      mesh.billboardMode = effect.kind === 'glow' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL
      if (effect.kind === 'glow') mesh.rotation.x = Math.PI * half
      return { mesh, reducedLayer: index % reducedDensityGroupSize !== omittedPatchIndex, side: random() - half, across: random() - half, phase: random(), size: phenomenonPatch.minimumScale + random() * phenomenonPatch.scaleVariation }
    })
    return { effect, look, material, patches }
  })
  const sun = Vector3.Zero()
  return ({ time, weather, camera }: WildlifeFrame, mist: { mistDensity: number, scattering: number, reduced?: boolean } = shaderPresets.dawnSilver) => {
    for (const { effect, look, material, patches } of groups) {
      const { x, y, z, kind, extent } = effect
      const distance = Math.hypot(camera.x - x, camera.y - y, camera.z - z)
      const visibleAt = look.visibleDistance + extent * visibilityExtentMultiplier
      const strength = phenomenonStrength(kind, weather) * (1 - smoothRange(visibleAt * distanceFadeStart, visibleAt, distance))
        * (effect.scatter ? mist.mistDensity : 1)
      const reduced = effect.scatter && mist.reduced
      for (const { mesh, reducedLayer } of patches) mesh.setEnabled(strength > minimumVisibleStrength && (!reduced || reducedLayer))
      if (strength <= minimumVisibleStrength) continue
      if (effect.scatter) {
        const sunAngle = solarAngle(weather.hour)
        sun.set(-Math.cos(sunAngle), Math.sin(sunAngle), mistLighting.sunDirectionZ).normalize()
        material.setVector3('morningSun', sun)
        material.setVector3('mistEye', camera)
        material.setFloat('scattering', mist.scattering * (1 - weather.rain * mistLighting.rainScatteringLoss))
      }
      const flicker = kind === 'glow' ? glowLook.flickerBase + Math.sin(time * glowLook.flickerSpeed) * glowLook.flickerAmplitude : 1
      material.setFloat('opacity', look.opacity * strength * flicker * (reduced ? mistLighting.reducedOpacityMultiplier : 1))
      for (const { mesh, side, across, phase, size } of patches) {
        if (!mesh.isEnabled()) continue
        const progress = (phase + time * (phenomenonPatch.speed + weather.rain * phenomenonPatch.rainSpeedFactor)) % 1
        const drift = kind === 'mist' ? Math.sin(time * mistLook.driftSpeed + phase * fullTurn) * mistLook.driftExtent : 0
        const climb = kind === 'spray' ? Math.sin(progress * Math.PI) * extent * sprayLook.climbExtent : 0
        const lift = kind === 'mist' ? (mistLook.lift + phase * mistLook.liftVariation) * extent : phenomenonPatch.lift
        mesh.position.set(x + (side + drift) * extent, y + lift + climb, z + (across + (kind === 'spray' ? progress * sprayLook.travelExtent : -drift)) * extent)
        const fade = kind === 'spray' ? Math.sin(progress * Math.PI) : 1
        mesh.scaling.set(look.width * extent * size * fade, look.height * extent * size * fade, 1)
      }
    }
  }
}
