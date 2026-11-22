import { Camera } from '@babylonjs/core/Cameras/camera'
import { Constants } from '@babylonjs/core/Engines/constants'
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { EffectWrapper } from '@babylonjs/core/Materials/effectRenderer'
import { ThinTexture } from '@babylonjs/core/Materials/Textures/thinTexture'
import type { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess'
import { postprocessVertexShader } from '@babylonjs/core/Shaders/postprocess.vertex'
import type { Scene } from '@babylonjs/core/scene'
import type { Weather } from './protocol'
import { sunShaftFragment } from './assets/effects/island-atmosphere'
import { sunShafts } from './assets/recipes/island-atmosphere'
import { hoursPerHalfDay } from './weather'

export function createSunShafts(scene: Scene, shadows: ShadowGenerator) {
  const engine = scene.getEngine()
  const effectWrapper = new EffectWrapper({
    name: 'Island sun shafts',
    engine,
    vertexShader: postprocessVertexShader.shader,
    fragmentShader: sunShaftFragment,
    useAsPostProcess: true,
    uniforms: ['inverseViewProjection', 'sunViewProjection', 'eye', 'sunDirection', 'sunColor', 'strength', 'morningMist'],
    samplers: ['sceneDepth', 'sunDepth'],
  })
  const pass = new PostProcess('Island volumetric sunlight', 'islandSunShafts', { engine, effectWrapper })
  pass.samples = Math.min(sunShafts.maxSamples, engine.getCaps().maxMSAASamples)
  let depthSampler: ThinTexture
  pass.onSizeChangedObservable.add(() => {
    const input = pass.inputTexture
    const depth = input.depthStencilTexture ?? input.createDepthStencilTexture(0, false, true, input.samples, Constants.TEXTUREFORMAT_DEPTH24_STENCIL8)
    input.resolveMSAADepth = true
    depthSampler = new ThinTexture(depth)
  })

  const inverseViewProjection = Matrix.Identity()
  const sun = Vector3.Zero()
  const sunlight = shadows.getLight()
  let camera: Camera | undefined
  let strength = 0
  let morningMist = 0
  let scatteringColor: Color3
  pass.onApplyObservable.add((effect) => {
    if (!camera) return
    scene.getTransformMatrix().invertToRef(inverseViewProjection)
    sunlight.direction.scaleToRef(-1, sun)
    effect.setTexture('sceneDepth', depthSampler)
    effect.setDepthStencilTexture('sunDepth', shadows.getShadowMapForRendering())
    effect.setMatrix('inverseViewProjection', inverseViewProjection)
    effect.setMatrix('sunViewProjection', shadows.getTransformMatrix())
    effect.setVector3('eye', camera.globalPosition)
    effect.setVector3('sunDirection', sun)
    effect.setColor3('sunColor', scatteringColor)
    effect.setFloat('morningMist', morningMist)
    effect.setFloat('strength', strength)
  })
  scene.onDisposeObservable.addOnce(() => {
    pass.dispose(camera)
    effectWrapper.dispose()
  })

  return (sunElevation: number, weather: Weather, color: Color3, intensity: number) => {
    const lowSun = Math.min(1, sunElevation / sunShafts.riseElevation, (sunShafts.upperElevation - sunElevation) / sunShafts.upperFade)
    morningMist = weather.hour < hoursPerHalfDay ? Math.max(0, Math.min(1, (sunShafts.mistFadeElevation - sunElevation) / sunShafts.mistFadeSpan)) : 0
    strength = Math.max(0, lowSun) * (1 - weather.rain) ** sunShafts.rainExponent * (sunShafts.baseStrength + sunShafts.mistBoost * morningMist) * intensity
    scatteringColor = color
    const active = scene.activeCamera
    const next = strength > sunShafts.visibilityThreshold && active?.mode === Camera.PERSPECTIVE_CAMERA && pass.isReady() ? active : undefined
    if (camera !== next) {
      camera?.detachPostProcess(pass)
      camera = next
      camera?.attachPostProcess(pass)
    }
  }
}
