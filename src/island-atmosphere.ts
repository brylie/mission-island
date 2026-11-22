import { Atmosphere } from '@babylonjs/addons/atmosphere'
import { Camera } from '@babylonjs/core/Cameras/camera'
import '@babylonjs/core/Culling/ray' // Registers the camera ray methods used by Atmosphere.
import { Constants } from '@babylonjs/core/Engines/constants'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import type { Scene } from '@babylonjs/core/scene'
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import type { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import type { Weather } from './protocol'
import { goldenHourLight, goldenHourPreset } from './golden-hour'
import { createSunShafts } from './island-sun-shafts'
import { seededRandom } from './scenery'
import { dawnHour, solarAngle, weatherAt } from './weather'
import { skyFragment, skyVertex } from './assets/effects/island-atmosphere'
import { islandAtmosphere } from './assets/recipes/island-atmosphere'

export function sceneWeather(fixed?: Weather, live?: Weather) {
  return fixed ? { weather: fixed } : { weather: live ?? { hour: dawnHour, rain: 0 }, weatherAt: live && weatherAt }
}

const halfSpan = 0.5

interface RainRoof { x: number, y: number, z: number, width: number, depth: number }

export function createAtmosphere(scene: Scene, sky: HemisphericLight, sunlight: DirectionalLight, shadows: ShadowGenerator, diameter: number = islandAtmosphere.dome.diameter, rainRoof?: RainRoof) {
  const { dome: skyDome, scatteringMinimum, sun: solar, tint, zenith: zenithTint, fog, skyFill, visualLight, rain: rainfall } = islandAtmosphere
  const engine = scene.getEngine()
  const physical = Atmosphere.IsSupported(engine)
    ? new Atmosphere('Island atmospheric scattering', scene, [sunlight], {
        skyRenderingGroup: -1,
        aerialPerspectiveRenderingGroup: -1,
        globeAtmosphereRenderingGroup: -1,
        minimumMultiScatteringIntensity: scatteringMinimum,
      })
    : undefined
  const updateSunShafts = physical && !engine.isWebGPU && shadows.usePercentageCloserFiltering
    ? createSunShafts(scene, shadows)
    : undefined
  let physicalReady = false
  let drawPhysicalSky = false
  let incidentSunIntensity = Math.PI
  let groundSunIntensity = sunlight.intensity
  const groundSunColor = sunlight.diffuse.clone()
  if (physical) {
    // Give the atmosphere incoming sunlight and keep the weather-driven
    // light levels on the island's existing materials.
    physical.onBeforeLightVariablesUpdateObservable.add(() => {
      sunlight.intensity = incidentSunIntensity
    })
    physical.onAfterRenderLutsForCameraObservable.add(() => {
      sunlight.intensity = groundSunIntensity
      sunlight.diffuse.copyFrom(groundSunColor)
    })
    // Composite the sky before the ocean and other transparent meshes.
    scene.onBeforeRenderingGroupObservable.add(({ renderingManager }) => {
      if (drawPhysicalSky && renderingManager === scene.renderingManager) physical.drawSkyCompositor()
    }, 1)
  }
  const dome = CreateSphere('Atmospheric sky', { diameter, segments: skyDome.segments }, scene)
  dome.isPickable = false
  dome.alwaysSelectAsActiveMesh = true
  dome.alphaIndex = -1
  const material = new ShaderMaterial('Island atmosphere', scene, { vertexSource: skyVertex, fragmentSource: skyFragment }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'sunDir', 'horizon', 'zenith', 'time', 'rain', 'light', 'physicalSky'],
    needAlphaBlending: true,
  })
  material.backFaceCulling = false
  material.disableDepthWrite = true
  material.alphaMode = Constants.ALPHA_PREMULTIPLIED_PORTERDUFF
  dome.material = material
  const random = seededRandom(rainfall.seed)
  const drops = Array.from({ length: rainfall.count }, () => ({ x: (random() - halfSpan) * rainfall.width, z: (random() - halfSpan) * rainfall.width, y: random() * rainfall.span }))
  const lines = drops.map(() => [Vector3.Zero(), Vector3.Zero()])
  const rain = CreateLineSystem('Rain', { lines, updatable: true }, scene)
  rain.color = Color3.FromHexString(rainfall.color)
  rain.isPickable = false
  rain.alwaysSelectAsActiveMesh = true
  const sun = Vector3.Zero()
  const horizon = new Color3()
  const zenith = new Color3()
  const dusk = Color3.FromHexString(tint.dusk)
  const day = Color3.FromHexString(tint.day)
  const night = Color3.FromHexString(tint.night)
  const rainTint = Color3.FromHexString(tint.rain)
  const haze = Color3.FromArray(goldenHourPreset.haze)
  return {
    supportsSunShafts: Boolean(updateSunShafts),
    update(time: number, weather: Weather, camera: Vector3, close: boolean, { shaftIntensity = 1, fogScale = 1 }: { shaftIntensity?: number, fogScale?: number } = {}) {
      const theta = solarAngle(weather.hour)
      sun.set(-Math.cos(theta), Math.sin(theta), solar.azimuthOffset).normalize()
      const light = Math.max(0, Math.min(1, (sun.y + solar.lightBias) * solar.lightGain))
      const twilight = Math.max(0, 1 - Math.abs(sun.y) * solar.twilightFalloff)
      Color3.LerpToRef(night, day, light, horizon)
      Color3.LerpToRef(horizon, dusk, twilight * tint.twilightBlend * (1 - weather.rain), horizon)
      const golden = goldenHourLight(sun.y, weather.rain)
      // Fog and the horizon take on the warm haze, so distance reads as low sunlight.
      Color3.LerpToRef(horizon, haze, golden.hazeAmount, horizon)
      Color3.LerpToRef(horizon, rainTint, weather.rain * tint.horizonRainBlend, horizon)
      const [red, green, blue] = zenithTint.minimum
      const [redGain, greenGain, blueGain] = zenithTint.lightGain
      zenith.set(red + light * redGain, green + light * greenGain, blue + light * blueGain)
      Color3.LerpToRef(zenith, rainTint, weather.rain * tint.zenithRainBlend, zenith)
      physicalReady ||= physical?.isReady() ?? false
      drawPhysicalSky = physicalReady && scene.activeCamera?.mode === Camera.PERSPECTIVE_CAMERA
      scene.fogColor.copyFrom(horizon)
      if (drawPhysicalSky) scene.clearColor.set(0, 0, 0, 1)
      else scene.clearColor.set(horizon.r, horizon.g, horizon.b, 1)
      if (close) {
        scene.fogStart = (fog.start - weather.rain * fog.rainStartLoss) * fogScale
        scene.fogEnd = (fog.end - weather.rain * fog.rainEndLoss) * fogScale
      }
      dome.position.copyFrom(camera)
      material.setVector3('sunDir', sun)
      material.setColor3('horizon', horizon)
      material.setColor3('zenith', zenith)
      material.setFloat('rain', weather.rain)
      material.setFloat('light', light)
      material.setFloat('time', time)
      material.setFloat('physicalSky', Number(drawPhysicalSky))
      // A cooler, dimmer sky fill lets the warm key light carry golden hour.
      sky.intensity = (skyFill.minimum + light * skyFill.daylightGain - weather.rain * skyFill.rainLoss) * golden.fillScale
      sky.diffuse.set(...golden.fill)
      incidentSunIntensity = Math.PI * (1 - weather.rain * solar.incidentRainLoss)
      groundSunColor.set(...golden.sun)
      sunlight.diffuse.copyFrom(groundSunColor)
      groundSunIntensity = Math.max(0, sun.y) ** solar.groundFalloff * (1 - weather.rain * solar.groundRainLoss) * golden.sunScale
      sunlight.intensity = groundSunIntensity
      sunlight.direction.copyFrom(sun).scaleInPlace(-1)
      if (!physical) sunlight.direction.y = -Math.max(solar.minimumGroundElevation, sun.y)
      sunlight.position.set(camera.x + sun.x * solar.shadowDistance, solar.shadowHeight, camera.z + sun.z * solar.shadowDistance)
      updateSunShafts?.(drawPhysicalSky ? sun.y : 0, weather, groundSunColor, shaftIntensity)
      rain.setEnabled(close && weather.rain > rainfall.activation)
      if (rain.isEnabled()) {
        rain.alpha = weather.rain * rainfall.opacity
        for (let i = 0; i < drops.length; i++) {
          const { x, y, z } = drops[i]
          const height = ((y - time * rainfall.fallSpeed) % rainfall.span + rainfall.span) % rainfall.span - rainfall.floorOffset
          const [head, tail] = lines[i]
          head.set(camera.x + x - height * rainfall.slant, camera.y + height, camera.z + z)
          tail.copyFromFloats(head.x + rainfall.streak.dx, head.y - rainfall.streak.dy, head.z)
          if (!rainRoof || tail.y >= rainRoof.y || Math.abs(head.z - rainRoof.z) >= rainRoof.depth * halfSpan) continue
          // Follow the slant of the streak back to its intersection with the roof.
          const roofX = tail.x - (rainRoof.y - tail.y) * rainfall.streak.dx / rainfall.streak.dy
          if (Math.abs(roofX - rainRoof.x) >= rainRoof.width * halfSpan) continue
          if (head.y <= rainRoof.y) tail.copyFrom(head)
          else tail.copyFromFloats(roofX, rainRoof.y, head.z)
        }
        CreateLineSystem('Rain', { lines, instance: rain }, scene)
      }
      return visualLight.minimum + light * visualLight.daylightGain
    },
  }
}
