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

const fragment = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D sceneDepth;
uniform highp sampler2DShadow sunDepth;
uniform mat4 inverseViewProjection;
uniform mat4 sunViewProjection;
uniform vec3 eye;
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float morningMist;
uniform float strength;

float sunlight(vec3 uvDepth) {
  vec3 edge = min(uvDepth, 1. - uvDepth);
  float coverage = smoothstep(0., .015, min(edge.x, min(edge.y, edge.z)));
  return mix(1., texture(sunDepth, vec3(uvDepth.xy, uvDepth.z - .0005)), coverage);
}

void main() {
  vec4 surface = texture2D(textureSampler, vUV);
  float depth = texture2D(sceneDepth, vUV).r;
  vec4 end = inverseViewProjection * vec4(vUV * 2. - 1., depth * 2. - 1., 1.);
  vec3 ray = end.xyz / end.w - eye;
  vec3 direction = normalize(ray);
  float cosine = dot(direction, sunDirection);
  float anisotropy = mix(.64, .60, morningMist);
  float phase = pow((1. - anisotropy) * (1. - anisotropy) /
    (1. + anisotropy * anisotropy - 2. * anisotropy * cosine), 1.5);

  const int samples = 24;
  float stepSize = min(length(ray), 85.) / float(samples);
  float offset = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  vec3 stepWorld = direction * stepSize;
  vec3 position = eye + stepWorld * offset;
  // The sun uses an orthographic shadow camera, so its depth coordinates
  // advance linearly along the view ray.
  vec3 uvDepth = (sunViewProjection * vec4(position, 1.)).xyz * .5 + .5;
  vec3 stepDepth = (sunViewProjection * vec4(stepWorld, 0.)).xyz * .5;
  float transmission = 1.;
  float scattering = 0.;
  for (int i = 0; i < samples; i++) {
    float density = mix(.036, .054, morningMist) * exp(-max(position.y, 0.) * .13);
    float opacity = 1. - exp(-density * stepSize);
    scattering += transmission * opacity * sunlight(uvDepth);
    transmission *= 1. - opacity;
    position += stepWorld;
    uvDepth += stepDepth;
  }
  gl_FragColor = vec4(mix(surface.rgb, sunColor, strength * phase * scattering), surface.a);
}`

export function createSunShafts(scene: Scene, shadows: ShadowGenerator) {
  const engine = scene.getEngine()
  const effectWrapper = new EffectWrapper({
    name: 'Island sun shafts',
    engine,
    vertexShader: postprocessVertexShader.shader,
    fragmentShader: fragment,
    useAsPostProcess: true,
    uniforms: ['inverseViewProjection', 'sunViewProjection', 'eye', 'sunDirection', 'sunColor', 'strength', 'morningMist'],
    samplers: ['sceneDepth', 'sunDepth'],
  })
  const pass = new PostProcess('Island volumetric sunlight', 'islandSunShafts', { engine, effectWrapper })
  pass.samples = Math.min(4, engine.getCaps().maxMSAASamples)
  let depthSampler: ThinTexture
  pass.onSizeChangedObservable.add(() => {
    const input = pass.inputTexture
    const depth = input.depthStencilTexture ?? input.createDepthStencilTexture(0, false, true,
      input.samples, Constants.TEXTUREFORMAT_DEPTH24_STENCIL8)
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
    const lowSun = Math.min(1, sunElevation / 0.08, (0.48 - sunElevation) / 0.2)
    morningMist = weather.hour < 12 ? Math.max(0, Math.min(1, (0.42 - sunElevation) / 0.24)) : 0
    strength = Math.max(0, lowSun) * (1 - weather.rain) ** 2 * (0.44 + 0.06 * morningMist) * intensity
    scatteringColor = color
    const active = scene.activeCamera
    const next = strength > 0.001 && active?.mode === Camera.PERSPECTIVE_CAMERA && pass.isReady() ? active : undefined
    if (camera !== next) {
      camera?.detachPostProcess(pass)
      camera = next
      camera?.attachPostProcess(pass)
    }
  }
}
