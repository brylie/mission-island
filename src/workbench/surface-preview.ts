import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { Scene } from '@babylonjs/core/scene'
import fragmentSource from './surface.frag.glsl?raw'
import vertexSource from './surface.vert.glsl?raw'

import { lightingPresets } from './lighting'
import type { LightingPreset } from './lighting'

export function createSurfaceShader(scene: Scene, pattern: number, onError: (message: string) => void) {
  const shader = new ShaderMaterial('Surface shader', scene, { vertexSource, fragmentSource }, {
    attributes: ['position', 'normal'],
    uniforms: [
      'world',
      'worldViewProjection',
      'baseColor',
      'lightDirection',
      'lightColor',
      'eyePosition',
      'ambient',
      'sunlight',
      'detailScale',
      'detailStrength',
      'time',
      'pattern',
    ],
  })
  shader.setInt('pattern', pattern)
  shader.onError = (_, errors) => onError(errors)

  return {
    shader,
    apply(preset: LightingPreset, color: string, scale: number, strength: number, time: number) {
      const lighting = lightingPresets[preset]
      shader.setVector3('lightDirection', lighting.direction.scale(-1))
      shader.setColor3('lightColor', Color3.FromHexString(lighting.color))
      shader.setColor3('baseColor', Color3.FromHexString(color))
      if (scene.activeCamera) shader.setVector3('eyePosition', scene.activeCamera.position)
      shader.setFloat('ambient', lighting.ambient)
      shader.setFloat('sunlight', lighting.sun)
      shader.setFloat('detailScale', scale)
      shader.setFloat('detailStrength', strength)
      shader.setFloat('time', time)
    },
  }
}
