import { dawnMistShaderSample, meadowShaderSample, pavingShaderSample, shellglassShaderSample, studyQuadTriangles } from '../assets/geometry/workbench-shader-stages'
import { mirrorPoolMist } from '../assets/recipes/starter-phenomena'
import { previewShaderComparisons, previewShaderPlayback, previewShaderSliders } from '../assets/recipes/workbench-shader-stages'
import { createSidewalk, createTrail } from '../assets/routes'
import type { MeshFactory } from '../island-meshes'
import { createPhenomena } from '../island-phenomena'
import { createSurfaceMaterial } from '../materials'
import { createMeadowBlades, createMeadowSurface } from '../meadow-shaders'
import { createOceanMaterial } from '../ocean'
import { distanceToRoute, meadowPath } from '../routes'
import { seededRandom } from '../seeded-random'
import { meadowDefaults, shaderPresets, shoreDefaults } from '../shader-studies'
import { groundHeight, meadowHill, tidePool, waterLevel } from '../terrain'
import { createWetPaving } from '../wet-paving'
import type { Point } from '../world'
import { control, range, type Entry, type Values } from './subject'

function comparison(label: string, settings: Values) {
  return {
    label,
    enabled: (values: Values) => Object.entries(settings).some(([key, value]) => values[key] !== value),
    run: (values: Values) => { Object.assign(values, settings) },
  }
}

const half = 0.5
const halves = 2

function terrainSample(meshes: MeshFactory, center: Point, sample: typeof shellglassShaderSample | typeof meadowShaderSample, surface: 'sand' | 'grass') {
  const { width, depth, segments, uvTile } = sample
  const positions: number[] = [], indices: number[] = [], uvs: number[] = []
  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      const x = center.x + (i / segments - half) * width
      const z = center.z + (j / segments - half) * depth
      positions.push(x, groundHeight({ x, z }), z)
      uvs.push(x / uvTile, z / uvTile)
      if (i && j) {
        const d = j * (segments + 1) + i
        const b = d - segments - 1
        indices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const material = surface === 'sand' ? meshes.paintSurface('sand') : meshes.paintRecipe('meadow-turf')
  meshes.surface(surface === 'sand' ? 'Shellglass basin and sill' : 'Meadow slope', positions, indices, material, undefined, uvs)
  return material
}

function shoreStudy(meshes: MeshFactory) {
  terrainSample(meshes, tidePool, shellglassShaderSample, 'sand')
  const { x, z } = tidePool
  const water = createOceanMaterial(meshes.scene)
  const { width, depth, stones } = shellglassShaderSample
  const halfWidth = width / halves, halfDepth = depth / halves
  meshes.surface('Shellglass water', [
    x - halfWidth,
    waterLevel,
    z - halfDepth,
    x + halfWidth,
    waterLevel,
    z - halfDepth,
    x + halfWidth,
    waterLevel,
    z + halfDepth,
    x - halfWidth,
    waterLevel,
    z + halfDepth,
  ], [...studyQuadTriangles], water.material)
  const random = seededRandom(stones.seed)
  for (let i = 0; i < stones.count; i++) {
    const px = x + (random() - half) * stones.width, pz = z + (random() - half) * stones.depth
    const size = stones.size + random() * stones.sizeVariation
    const y = groundHeight({ x: px, z: pz }) + stones.lift
    meshes.sphere(px, y, pz, size, size * stones.heightRatio, size * stones.depthRatio, stones.colors[i % stones.colors.length], undefined, false)
  }
  return water.pose
}

const { hour: shoreHour, focusLift: shoreFocusLift, ...shoreFraming } = previewShaderPlayback.shore
const shoreStage = {
  group: 'Water and shore',
  source: 'src/ocean.ts',
  ...shoreFraming,
  cameraFocus: [tidePool.x, waterLevel + shoreFocusLift, tidePool.z],
  weather: () => ({ hour: shoreHour, rain: 0 }),
} as const
const qualityControl = control('quality', 'Wave detail', 'full', { full: 'Full', low: 'Reduced' })

const { bladeFocus } = meadowShaderSample
const windFocus = { x: meadowHill.x + bladeFocus.x, z: meadowHill.z + bladeFocus.z }

function meadowStudy(meshes: MeshFactory) {
  const { x, z } = meadowHill
  const { centreZ, blades: bladeLayout } = meadowShaderSample
  const surface = terrainSample(meshes, { x, z: z + centreZ }, meadowShaderSample, 'grass')
  const terrain = createMeadowSurface(surface)
  createTrail(meshes, meadowPath.name, meadowPath.points, meadowPath.width, meadowPath.surface, groundHeight)
  const random = seededRandom(bladeLayout.scatterSeed)
  const points = Array.from({ length: bladeLayout.count }, () => {
    const px = x + (random() - half) * bladeLayout.width
    return { x: px, z: z + (random() - half) * bladeLayout.depth }
  }).filter((point) => distanceToRoute(point, meadowPath.points) > bladeLayout.trailClearance)
  points.push(windFocus)
  for (const { x: dx, z: dz } of bladeLayout.focusOffsets) points.push({ x: windFocus.x + dx, z: windFocus.z + dz })
  const blades = createMeadowBlades(meshes, points, groundHeight, bladeLayout.seed)
  return (time: number, camera: Point & { y: number }, settings: typeof meadowDefaults) => {
    terrain(time, camera, settings)
    blades(time, camera, settings)
  }
}

const { hour: meadowHour, ...meadowFraming } = previewShaderPlayback.meadow
const meadowStage = {
  group: 'Vegetation and terrain',
  source: 'src/meadow-shaders.ts',
  ...meadowFraming,
  weather: () => ({ hour: meadowHour, rain: 0 }),
} as const
const { grassDistance: windGrassDistance, ...windFraming } = previewShaderPlayback.foliageWind
const { hour: pavingHour, ...pavingFraming } = previewShaderPlayback.paving
const { hour: mistHour, ...mistFraming } = previewShaderPlayback.dawnMist

export const shaderStudies: Entry[] = [
  {
    ...shoreStage,
    id: 'shallow-water',
    name: 'Shallow water depth',
    description: 'At Shellglass, compare how much of the sill and the deeper basin remain visible through the water.',
    controls: [range('clarity', 'Water clarity', shoreDefaults.clarity, ...previewShaderSliders.clarity), qualityControl],
    actions: [comparison('Clouded water', previewShaderComparisons.cloudedWater), comparison('Clear Water', shaderPresets.clearWater)],
    create(meshes) {
      const pose = shoreStudy(meshes)
      return ({ time, light, rain }, values) => pose(time, light, rain, {
        clarity: Number(values.clarity),
        foamReach: 0,
        quality: values.quality === 'low' ? 'low' : 'full',
      })
    },
  },
  {
    ...shoreStage,
    id: 'surf-foam',
    name: 'Shoreline surf foam',
    description: 'Use Shellglass Tide Pool to watch a broken foam front advance toward the sill and recede.',
    controls: [range('foamReach', 'Maximum wash depth (m)', shoreDefaults.foamReach, ...previewShaderSliders.foamReach), qualityControl],
    actions: [comparison('Small wash', previewShaderComparisons.smallWash), comparison('Surf Wash', shaderPresets.surfWash)],
    create(meshes) {
      const pose = shoreStudy(meshes)
      return ({ time, light, rain }, values) => pose(time, light, rain, {
        ...shoreDefaults,
        foamReach: Number(values.foamReach),
        quality: values.quality === 'low' ? 'low' : 'full',
      })
    },
  },
  {
    ...meadowStage,
    id: 'foliage-wind',
    name: 'Rooted foliage wind',
    ...windFraming,
    cameraFocus: [windFocus.x, groundHeight(windFocus) + bladeFocus.y, windFocus.z],
    description: 'Zoom into the meadow blades and scrub the gust. The stem holds its position as the tip bends.',
    controls: [range('gust', 'Gust strength', meadowDefaults.gust, ...previewShaderSliders.gust)],
    actions: [comparison('Still air', { gust: 0 }), comparison('Sea Breeze', shaderPresets.seaBreeze)],
    create(meshes) {
      const pose = meadowStudy(meshes)
      return ({ time, camera }, values) => pose(time, camera, { ...meadowDefaults, gust: Number(values.gust), grassDistance: windGrassDistance })
    },
  },
  {
    ...meadowStage,
    id: 'meadow-distance',
    name: 'Meadow grass distance blend',
    description: 'Zoom out over the path and watch fine blades give way to irregular, world-aligned grass patches.',
    controls: [
      range('grassDistance', 'Blade fade ends (m)', meadowDefaults.grassDistance, ...previewShaderSliders.grassDistance),
      range('patchContrast', 'Patch contrast', meadowDefaults.patchContrast, ...previewShaderSliders.patchContrast),
    ],
    actions: [comparison('Blade detail', previewShaderComparisons.bladeDetail), comparison('Rolling Meadow', shaderPresets.rollingMeadow)],
    create(meshes) {
      const pose = meadowStudy(meshes)
      return ({ time, camera }, values) => pose(time, camera, {
        gust: meadowDefaults.gust,
        grassDistance: Number(values.grassDistance),
        patchContrast: Number(values.patchContrast),
      })
    },
  },
  {
    id: 'rain-paving',
    name: 'Rain-darkened paving',
    group: 'Weather and light',
    source: 'src/wet-paving.ts',
    description: 'Tilt along the Seabrook pavement sample to see damp concrete and broken sky reflections at grazing angles.',
    ...pavingFraming,
    weather: () => ({ hour: pavingHour, rain: 0 }),
    controls: [
      range('wetness', 'Surface wetness', shaderPresets.rainPolished.wetness, ...previewShaderSliders.wetness),
      range('reflection', 'Reflection strength', shaderPresets.rainPolished.reflection, ...previewShaderSliders.reflection),
    ],
    actions: [comparison('Dry pavement', { wetness: 0 }), comparison('Rain Polished', shaderPresets.rainPolished)],
    create(meshes) {
      const concrete = createSurfaceMaterial(meshes.scene, 'concrete')
      const wetness = createWetPaving(concrete)
      const { sidewalk, grass } = pavingShaderSample
      createSidewalk(meshes, sidewalk, concrete)
      meshes.box(0, grass.centreY, 0, ...grass.size, meshes.paintSurface('grass'), undefined, false)
      return (_frame, values) => wetness(Number(values.wetness), Number(values.reflection))
    },
  },
  {
    id: 'dawn-mist',
    name: 'Low-angle light in mist',
    group: 'Weather and light',
    source: 'src/island-phenomena.ts',
    description: 'Orbit a Mirror Pool mist bank toward the dawn sun, then change the hour or compare scattering at the same angle.',
    ...mistFraming,
    weather: (_time, values) => ({ hour: Number(values.hour), rain: 0 }),
    controls: [
      range('hour', 'Island hour', mistHour, ...previewShaderSliders.hour),
      range('mistDensity', 'Mist density', shaderPresets.dawnSilver.mistDensity, ...previewShaderSliders.mistDensity),
      range('scattering', 'Forward scattering', shaderPresets.dawnSilver.scattering, ...previewShaderSliders.scattering),
      control('quality', 'Mist layers', 'full', { full: 'Full', low: 'Reduced' }),
    ],
    actions: [
      comparison('Flat mist', { hour: mistHour, mistDensity: shaderPresets.dawnSilver.mistDensity, scattering: 0 }),
      comparison('Dawn Silver', { hour: mistHour, ...shaderPresets.dawnSilver }),
    ],
    create(meshes) {
      const water = createOceanMaterial(meshes.scene, 'preview')
      const { water: waterBox, rocks, mistHeight } = dawnMistShaderSample
      meshes.box(0, waterBox.centreY, 0, ...waterBox.size, water.material, undefined, false)
      for (const { x, z, scale } of rocks.positions) {
        meshes.sphere(x, rocks.centreY, z, rocks.width * scale, rocks.height * scale, rocks.depth * scale, rocks.color, undefined, false)
      }
      const pose = createPhenomena(meshes.scene, [{ ...mirrorPoolMist, x: 0, y: mistHeight, z: 0 }])
      return ({ time, camera, delta, light, seek }, values) => {
        water.pose(time, light)
        pose({ time, camera, delta, seek, weather: { hour: Number(values.hour), rain: 0 }, threats: [] }, {
          mistDensity: Number(values.mistDensity),
          scattering: Number(values.scattering),
          reduced: values.quality === 'low',
        })
      }
    },
  },
]
