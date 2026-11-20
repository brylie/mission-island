import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { seededRandom } from './seeded-random'
import { shaderPresets } from './shader-studies'
import type { WildlifeFrame } from './wildlife'
import { phenomenonStrength, smoothRange } from './wildlife-motion'

type Kind = 'mist' | 'spray' | 'glow'
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

const config = {
  mist: { tint: '#d8e9d8', count: 9, width: .51, height: .105, opacity: .44 },
  spray: { tint: '#e0f2ed', count: 13, width: .37, height: .34, opacity: .49 },
  glow: { tint: '#81e5d1', count: 11, width: .14, height: .085, opacity: .8 },
}

export function createPhenomena(scene: Scene, effects: readonly Effect[]) {
  const groups = effects.map((effect) => {
    const look = config[effect.kind]
    const material = new ShaderMaterial(effect.name, scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        #ifdef LIT_MIST
        uniform mat4 world;
        varying vec3 mistPoint;
        #endif
        varying vec2 texCoord;
        void main() {
          texCoord = uv;
          #ifdef LIT_MIST
          mistPoint = (world * vec4(position, 1.)).xyz;
          #endif
          gl_Position = worldViewProjection * vec4(position, 1.);
        }
      `,
      fragmentSource: `
        precision highp float;
        varying vec2 texCoord;
        uniform vec3 tint;
        uniform float opacity;
        #ifdef LIT_MIST
        varying vec3 mistPoint;
        uniform vec3 mistEye;
        uniform vec3 morningSun;
        uniform float scattering;
        #endif
        void main() {
          vec2 p = (texCoord - .5) * 2.;
          float wisps = 0.9 + sin(p.x * 13. + sin(p.y * 6.) * 1.2) * .1;
          float weight = max(0., 1. - dot(p,p));
          vec3 color = tint;
          float alpha = opacity * weight * weight * wisps;
          #ifdef LIT_MIST
          if (scattering > 0.) {
            vec3 ray = normalize(mistPoint - mistEye);
            float g = .62;
            float forward = (1. - g*g) / pow(1. + g*g - 2.*g*dot(ray, morningSun), 1.5);
            float lowSun = smoothstep(-.035, .045, morningSun.y) * (1. - smoothstep(.15, .52, morningSun.y));
            float light = (1. - exp(-forward * lowSun * scattering * .22));
            color = mix(tint * .83, vec3(1., .78, .51), light);
            alpha += light * weight * weight * wisps * opacity * .52;
          }
          #endif
          gl_FragColor = vec4(color, clamp(alpha, 0., 1.));
        }
      `,
    }, { attributes: ['position', 'uv'], uniforms: ['world', 'worldViewProjection', 'tint', 'opacity', 'mistEye', 'morningSun', 'scattering'],
      defines: effect.scatter ? ['#define LIT_MIST'] : [], needAlphaBlending: true })
    material.backFaceCulling = false
    material.setColor3('tint', Color3.FromHexString(look.tint))
    const random = seededRandom(effect.seed)
    const patches = Array.from({ length: look.count }, (_, index) => {
      const mesh = CreatePlane(effect.name, { size: 1 }, scene)
      mesh.isPickable = false
      mesh.material = material
      mesh.alphaIndex = 2
      mesh.billboardMode = effect.kind === 'glow' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL
      if (effect.kind === 'glow') mesh.rotation.x = Math.PI / 2
      return { mesh, reducedLayer: index % 3 !== 2, side: random() - .5, across: random() - .5, phase: random(), size: .65 + random() * .65 }
    })
    return { effect, look, material, patches }
  })
  const sun = Vector3.Zero()
  return ({ time, weather, camera }: WildlifeFrame, mist: { mistDensity: number; scattering: number; reduced?: boolean } = shaderPresets.dawnSilver) => {
    for (const { effect, look, material, patches } of groups) {
      const { x, y, z, kind, extent } = effect
      const distance = Math.hypot(camera.x - x, camera.y - y, camera.z - z)
      const visibleAt = kind === 'mist' ? 48 + extent * 2.5 : 27 + extent * 2.5
      const strength = phenomenonStrength(kind, weather) * (1 - smoothRange(visibleAt * .7, visibleAt, distance))
        * (effect.scatter ? mist.mistDensity : 1)
      const reduced = effect.scatter && mist.reduced
      for (const { mesh, reducedLayer } of patches) mesh.setEnabled(strength > .01 && (!reduced || reducedLayer))
      if (strength <= .01) continue
      if (effect.scatter) {
        const solarAngle = (weather.hour - 6) * Math.PI / 12
        sun.set(-Math.cos(solarAngle), Math.sin(solarAngle), -.24).normalize()
        material.setVector3('morningSun', sun)
        material.setVector3('mistEye', camera)
        material.setFloat('scattering', mist.scattering * (1 - weather.rain * .8))
      }
      const flicker = kind === 'glow' ? .77 + Math.sin(time * 2.5) * .23 : 1
      material.setFloat('opacity', look.opacity * strength * flicker * (reduced ? 1.2 : 1))
      for (const { mesh, side, across, phase, size } of patches) {
        if (!mesh.isEnabled()) continue
        const progress = (phase + time * (.24 + weather.rain * .16)) % 1
        const drift = kind === 'mist' ? Math.sin(time * .21 + phase * Math.PI * 2) * .14 : 0
        const climb = kind === 'spray' ? Math.sin(progress * Math.PI) * extent * .26 : 0
        const lift = kind === 'mist' ? (.055 + phase * .024) * extent : .035
        mesh.position.set(x + (side + drift) * extent, y + lift + climb,
          z + (across + (kind === 'spray' ? progress * .42 : -drift)) * extent)
        const fade = kind === 'spray' ? Math.sin(progress * Math.PI) : 1
        mesh.scaling.set(look.width * extent * size * fade, look.height * extent * size * fade, 1)
      }
    }
  }
}
