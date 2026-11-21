import { createCrew } from '../assets/crew'
import { createHarborBoat } from '../assets/waterfront'
import type { MeshFactory } from '../island-meshes'
import { interactiveStudies, type StudyId } from '../interactive-shaders/catalog'
import { demonstrationLamp, studyBuilders } from '../interactive-shaders/effects'
import type { EffectFrame, Place } from '../interactive-shaders/render'
import { movingWakeStrength, skiffStudyPose } from '../interactive-shaders/skiff-wake'
import { createOceanMaterial } from '../ocean'
import { seededRandom } from '../seeded-random'
import { range, type Entry } from './subject'

const studioBase = { x: 0, y: 0, z: 0 }
const waterStudies = new Set<StudyId>(['skiff-wake', 'wading-rings', 'seabed-caustics', 'water-rain-rings', 'moon-glitter', 'timber-salt-bloom'])
const wetOrigin: Partial<Record<StudyId, number>> = { 'streetlamp-droplets': 2.59, 'window-parallax': 1.31 }

function waterSample(meshes: MeshFactory, id: StudyId) {
  const width = id === 'moon-glitter' ? 23 : id === 'skiff-wake' ? 28 : 12
  const depth = id === 'moon-glitter' ? 29 : id === 'skiff-wake' ? 17 : 12
  const clear = id === 'seabed-caustics'
  const water = createOceanMaterial(meshes.scene, 'preview')
  const glass = meshes.paint('#77bde1')
  glass.alpha = 0.28
  const tile = meshes.surface('Studio water', [-width / 2, -0.022, -depth / 2, width / 2, -0.022, -depth / 2, width / 2, -0.022, depth / 2, -width / 2, -0.022, depth / 2], [0, 1, 2, 0, 2, 3], clear ? glass : water.material)
  tile.alphaIndex = 0
  if (clear) {
    const bed = meshes.paintSurface('sand', '#ae9f78')
    const floor = meshes.box(0, -0.52, 0, width, 0.12, depth, bed, undefined, false)
    floor.receiveShadows = true
    const random = seededRandom(371)
    for (let i = 0; i < 13; i++) {
      const x = (random() - 0.5) * 6, z = (random() - 0.5) * 4.8
      const rock = 0.12 + random() * 0.48
      meshes.sphere(x, -0.39, z, rock, 0.16, rock * 0.7, '#848671', undefined, false)
    }
  }
  return ({ time, light, weather }: EffectFrame) => {
    if (!clear) water.pose(time, light, weather.rain)
  }
}

function placeStudioContext(meshes: MeshFactory, id: StudyId) {
  if (id === 'wading-rings') {
    const crew = createCrew(meshes, 0)
    crew.root.position.y = -0.34
    crew.root.rotation.y = -0.18
  }
  if (id === 'canopy-dapple' || id === 'meadow-pollen') {
    meshes.box(0, -0.062, 0, 11, 0.11, 9, meshes.paintSurface('grass', '#568050'), undefined, false)
    const dark = id === 'canopy-dapple'
    for (const [x, z, h] of [[-3, 2.7, 2.1], [3.5, 2.3, 2.4], [-2.8, -1.8, 1.32], [1.6, 3.2, 1.57]]) {
      meshes.sphere(x, h * 0.62, z, h * 1.4, h, h * 0.99, dark ? '#416249' : '#39654e', undefined, false)
      meshes.cylinder(x, h * 0.25, z, 0.12, 0.26, h * 0.5, 6, '#6d5940', undefined, false)
    }
  }
  if (id === 'closing-flowers' || id === 'reed-transmission') {
    const tint = id === 'closing-flowers' ? '#6e8755' : '#4b7060'
    meshes.box(0, -0.059, 0, 6, 0.11, 4.6, meshes.paintSurface('grass', tint), undefined, false)
  }
  if (id === 'sand-footprints') {
    meshes.box(0, -0.063, 0, 7, 0.12, 7, meshes.paintSurface('sand', '#bfac82'), undefined, false)
  }
  if (id === 'waterfall-shear' || id === 'fernfall-rainbow') placeCascadeSample(meshes, id === 'waterfall-shear')
  if (id === 'road-retroreflector') meshes.box(0, -0.078, 0, 7, 0.15, 4.6, meshes.paintSurface('stone', '#74806f'), undefined, false)
  if (id === 'rope-fiber-sheen') {
    meshes.cylinder(0, -0.12, 0, 1.73, 1.78, 0.23, 16, meshes.paintSurface('wood', '#8c693d'))
    meshes.cylinder(0, 0.08, 0, 0.15, 0.19, 0.21, 10, '#685744')
  }
}

function placeCascadeSample(meshes: MeshFactory, spill: boolean) {
  if (spill) {
    const bed = meshes.paintSurface('stone', '#668476')
    meshes.surface('Studio cascade bed', [-1.35, 3.22, -3.9, 1.35, 3.22, -3.9, 1.5, 2.51, -2.31, -1.5, 2.51, -2.31, -1.7, 0.31, 1.1, 1.69, 0.31, 1.1, 1.9, -0.02, 3.5, -1.9, -0.02, 3.5], [0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4, 4, 5, 6, 4, 6, 7], bed, undefined, [0, 0, 2, 0, 2, 0.8, 0, 0.8, 0, 2, 2, 2, 2, 3, 0, 3])
  }
  for (const [x, y, z, scale] of [[-1.8, 0.21, 1.4, 1.7], [1.4, 0.34, 1.6, 2.1], [-1.8, 0.68, -1, 1.6], [1.5, 1.3, -2, 1.8], [-1.1, 2.45, -3.85, 1.67]]) {
    meshes.sphere(spill ? x * 1.53 : x, y, z, scale * 1.58, scale * 0.88, scale * 1.25, meshes.paintSurface('stone', '#879083'), undefined, false)
  }
  meshes.box(0, -0.027, 1.45, 4.2, 0.046, 5.2, '#4b9a90', undefined, false)
}

function studioDetail(id: StudyId) {
  if (id === 'streetlamp-droplets') return 1
  if (id === 'timber-salt-bloom') return 0.17
  if (id === 'sand-footprints') return 1
  return 0
}

export const islandShaderStudies: Entry[] = interactiveStudies.map((study) => ({
  id: study.id,
  name: study.name,
  group: study.group,
  source: study.source,
  description: study.description,
  duration: 16,
  ground: { color: '#435749', height: waterStudies.has(study.id) ? -1.58 : 0 },
  angle: study.camera.alpha,
  cameraBeta: study.camera.beta,
  cameraRadius: study.camera.radius,
  cameraFocus: [0, study.camera.height, 0],
  weather: () => ({ hour: study.field.hour, rain: Math.min(0.22, study.field.rain) }),
  controls: [range('response', study.control, study.value, 0, 1, 0.01)],
  actions: [
    { label: study.baseline, enabled: (values) => values.response !== 0, run: (values) => { values.response = 0 } },
    { label: study.preset, enabled: (values) => values.response !== study.value, run: (values) => { values.response = study.value } },
  ],
  create(meshes) {
    const origin: Place = { ...studioBase, y: wetOrigin[study.id] ?? 0 }
    if (study.id === 'fernfall-rainbow') origin.y = 1.65
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
    const weather = { hour: study.field.hour, rain: Math.min(0.22, study.field.rain) }
    const lamp = study.id === 'road-retroreflector' ? demonstrationLamp(origin) : undefined
    const detail = studioDetail(study.id)
    return ({ time, camera, light }, values) => {
      const frame = { time, camera, light, weather, lamp }
      water?.(frame)
      effect.pose(frame, poseSkiff(time, Number(values.response)), detail)
    }
  },
}))
