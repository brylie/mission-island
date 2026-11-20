import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { seededRandom } from './scenery'
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
        varying vec2 texCoord;
        void main() {
          texCoord = uv;
          gl_Position = worldViewProjection * vec4(position, 1.);
        }
      `,
      fragmentSource: `
        precision highp float;
        varying vec2 texCoord;
        uniform vec3 tint;
        uniform float opacity;
        void main() {
          vec2 p = (texCoord - .5) * 2.;
          float wisps = 0.9 + sin(p.x * 13. + sin(p.y * 6.) * 1.2) * .1;
          float weight = max(0., 1. - dot(p,p));
          gl_FragColor = vec4(tint, opacity * weight * weight * wisps);
        }
      `,
    }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'tint', 'opacity'], needAlphaBlending: true })
    material.backFaceCulling = false
    material.setColor3('tint', Color3.FromHexString(look.tint))
    const random = seededRandom(effect.seed)
    const patches = Array.from({ length: look.count }, () => {
      const mesh = CreatePlane(effect.name, { size: 1 }, scene)
      mesh.isPickable = false
      mesh.material = material
      mesh.alphaIndex = 2
      mesh.billboardMode = effect.kind === 'glow' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL
      if (effect.kind === 'glow') mesh.rotation.x = Math.PI / 2
      return { mesh, side: random() - .5, across: random() - .5, phase: random(), size: .65 + random() * .65 }
    })
    return { effect, look, material, patches }
  })
  return ({ time, weather, camera }: WildlifeFrame) => {
    for (const { effect, look, material, patches } of groups) {
      const { x, y, z, kind, extent } = effect
      const distance = Math.hypot(camera.x - x, camera.y - y, camera.z - z)
      const visibleAt = kind === 'mist' ? 48 + extent * 2.5 : 27 + extent * 2.5
      const strength = phenomenonStrength(kind, weather) * (1 - smoothRange(visibleAt * .7, visibleAt, distance))
      for (const { mesh } of patches) mesh.setEnabled(strength > .01)
      if (strength <= .01) continue
      material.setFloat('opacity', look.opacity * strength * (kind === 'glow' ? .77 + Math.sin(time * 2.5) * .23 : 1))
      for (const { mesh, side, across, phase, size } of patches) {
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
