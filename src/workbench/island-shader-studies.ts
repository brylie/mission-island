import { createCrew } from '../assets/crew'
import { streetLampGeometry } from '../assets/geometry/site-props'
import { shaderStudioAnchors, shaderStudioCascade, shaderStudioGround, shaderStudioGrove, shaderStudioWater, studyQuadTriangles } from '../assets/geometry/workbench-shader-stages'
import { previewShaderPlayback, previewShaderSliders } from '../assets/recipes/workbench-shader-stages'
import { createHarborBoat } from '../assets/waterfront'
import type { MeshFactory } from '../island-meshes'
import { interactiveStudies, type StudyId } from '../interactive-shaders/catalog'
import { demonstrationLamp, studyBuilders } from '../interactive-shaders/effects'
import type { EffectFrame, Place } from '../interactive-shaders/render'
import { movingWakeStrength, skiffStudyPose } from '../interactive-shaders/skiff-wake'
import { createOceanMaterial } from '../ocean'
import { seededRandom } from '../seeded-random'
import { range, type Entry } from './subject'

const half = 0.5
const halves = 2
const waterStudies = new Set<StudyId>(['skiff-wake', 'wading-rings', 'seabed-caustics', 'water-rain-rings', 'moon-glitter', 'timber-salt-bloom'])
const effectHeight: Partial<Record<StudyId, number>> = {
  'streetlamp-droplets': streetLampGeometry.bulb.y,
  'window-parallax': shaderStudioAnchors.windowPaneY,
  'fernfall-rainbow': shaderStudioAnchors.cascadeMistY,
}
const studioGround: Partial<Record<StudyId, typeof shaderStudioGround[keyof typeof shaderStudioGround]>> = shaderStudioGround
const saltBloomStudioWaterline = 0.17

function waterSample(meshes: MeshFactory, id: StudyId) {
  const { pond, wake, moon, surfaceY, clearWater, bed, stones } = shaderStudioWater
  const { width, depth } = id === 'moon-glitter' ? moon : id === 'skiff-wake' ? wake : pond
  const clear = id === 'seabed-caustics'
  const water = createOceanMaterial(meshes.scene, 'preview')
  const glass = meshes.paint(clearWater.color)
  glass.alpha = clearWater.alpha
  const halfWidth = width / halves, halfDepth = depth / halves
  const positions = [-halfWidth, surfaceY, -halfDepth, halfWidth, surfaceY, -halfDepth, halfWidth, surfaceY, halfDepth, -halfWidth, surfaceY, halfDepth]
  const tile = meshes.surface('Studio water', positions, [...studyQuadTriangles], clear ? glass : water.material)
  tile.alphaIndex = 0
  if (clear) {
    const sand = meshes.paintSurface('sand', bed.color)
    const floor = meshes.box(0, bed.centreY, 0, width, bed.thickness, depth, sand, undefined, false)
    floor.receiveShadows = true
    const random = seededRandom(stones.seed)
    for (let i = 0; i < stones.count; i++) {
      const x = (random() - half) * stones.width, z = (random() - half) * stones.depth
      const size = stones.size + random() * stones.sizeVariation
      meshes.sphere(x, stones.centreY, z, size, stones.height, size * stones.depthRatio, stones.color, undefined, false)
    }
  }
  return ({ time, light, weather }: EffectFrame) => {
    if (!clear) water.pose(time, light, weather.rain)
  }
}

function placeStudioGrove(meshes: MeshFactory, dark: boolean) {
  const { trees, crown, trunk } = shaderStudioGrove
  const color = dark ? crown.shade : crown.daylight
  for (const { x, z, height } of trees) {
    meshes.sphere(x, height * crown.centreRatio, z, height * crown.widthRatio, height, height * crown.depthRatio, color, undefined, false)
    meshes.cylinder(x, height * trunk.centreRatio, z, trunk.topDiameter, trunk.bottomDiameter, height * trunk.heightRatio, trunk.sides, trunk.color, undefined, false)
  }
}

function placeStudioContext(meshes: MeshFactory, id: StudyId) {
  if (id === 'wading-rings') {
    const crew = createCrew(meshes, 0)
    crew.root.position.y = shaderStudioAnchors.wader.y
    crew.root.rotation.y = shaderStudioAnchors.wader.heading
  }
  const ground = studioGround[id]
  if (ground) {
    const [width, height, depth] = ground.size
    const material = meshes.paintSurface(ground.surface, ground.color)
    meshes.box(0, ground.centreY, 0, width, height, depth, material, undefined, false)
  }
  if (id === 'canopy-dapple' || id === 'meadow-pollen') placeStudioGrove(meshes, id === 'canopy-dapple')
  if (id === 'waterfall-shear' || id === 'fernfall-rainbow') placeCascadeSample(meshes, id === 'waterfall-shear')
  if (id === 'rope-fiber-sheen') {
    const { ropeBase, mooringPin } = shaderStudioAnchors
    meshes.cylinder(0, ropeBase.y, 0, ropeBase.topDiameter, ropeBase.bottomDiameter, ropeBase.height, ropeBase.sides, meshes.paintSurface('wood', ropeBase.color))
    meshes.cylinder(0, mooringPin.y, 0, mooringPin.topDiameter, mooringPin.bottomDiameter, mooringPin.height, mooringPin.sides, mooringPin.color)
  }
}

function placeCascadeSample(meshes: MeshFactory, spill: boolean) {
  const { bed, boulders, plungePool } = shaderStudioCascade
  if (spill) {
    const material = meshes.paintSurface('stone', bed.color)
    meshes.surface('Studio cascade bed', bed.positions.flat(), [...bed.triangles], material, undefined, bed.uvs.flat())
  }
  for (const { x, y, z, scale } of boulders.positions) {
    const px = spill ? x * boulders.spillSpread : x
    const material = meshes.paintSurface('stone', boulders.color)
    meshes.sphere(px, y, z, scale * boulders.widthRatio, scale * boulders.heightRatio, scale * boulders.depthRatio, material, undefined, false)
  }
  meshes.box(...plungePool.centre, ...plungePool.size, plungePool.color, undefined, false)
}

function studioDetail(id: StudyId) {
  if (id === 'streetlamp-droplets' || id === 'sand-footprints') return 1
  if (id === 'timber-salt-bloom') return saltBloomStudioWaterline
  return 0
}

const { duration, rainLimit, groundColor, waterGroundHeight } = previewShaderPlayback.effects

function studioWeather({ field }: typeof interactiveStudies[number]) {
  return { hour: field.hour, rain: Math.min(rainLimit, field.rain) }
}

export const islandShaderStudies: Entry[] = interactiveStudies.map((study) => ({
  id: study.id,
  name: study.name,
  group: study.group,
  source: study.source,
  description: study.description,
  duration,
  ground: { color: groundColor, height: waterStudies.has(study.id) ? waterGroundHeight : 0 },
  angle: study.camera.alpha,
  cameraBeta: study.camera.beta,
  cameraRadius: study.camera.radius,
  cameraFocus: [0, study.camera.height, 0],
  weather: () => studioWeather(study),
  controls: [range('response', study.control, study.value, ...previewShaderSliders.response)],
  actions: [
    { label: study.baseline, enabled: (values) => values.response !== 0, run: (values) => { values.response = 0 } },
    { label: study.preset, enabled: (values) => values.response !== study.value, run: (values) => { values.response = study.value } },
  ],
  create(meshes) {
    const origin: Place = { x: 0, y: effectHeight[study.id] ?? 0, z: 0 }
    const effect = studyBuilders[study.id](meshes, origin, true)
    const skiff = study.id === 'skiff-wake' ? createHarborBoat(meshes) : undefined
    const poseSkiff = (time: number, response: number) => {
      if (!skiff) return response
      const pose = skiffStudyPose(origin, time, response)
      const strength = movingWakeStrength(pose.speed)
      for (const root of [skiff, effect.root]) {
        root.position.set(pose.x, origin.y, pose.z)
        root.rotation.y = pose.heading
      }
      effect.root.setEnabled(strength > 0)
      return strength
    }
    if (skiff) poseSkiff(0, 0)
    const water = waterStudies.has(study.id) ? waterSample(meshes, study.id) : undefined
    placeStudioContext(meshes, study.id)
    const weather = studioWeather(study)
    const lamp = study.id === 'road-retroreflector' ? demonstrationLamp(origin) : undefined
    const detail = studioDetail(study.id)
    return ({ time, camera, light }, values) => {
      const frame = { time, camera, light, weather, lamp }
      water?.(frame)
      effect.pose(frame, poseSkiff(time, Number(values.response)), detail)
    }
  },
}))
