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

function terrainSample(meshes: MeshFactory, center: Point, width: number, depth: number, segments: number,
  surface: 'sand' | 'grass') {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = []
  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      const x = center.x + (i / segments - .5) * width
      const z = center.z + (j / segments - .5) * depth
      positions.push(x, groundHeight({ x, z }), z)
      uvs.push(x / 4.5, z / 4.5)
      if (i && j) {
        const d = j * (segments + 1) + i
        const b = d - segments - 1
        indices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const material = meshes.paintSurface(surface)
  meshes.surface(surface === 'sand' ? 'Shellglass basin and sill' : 'Meadow slope', positions, indices, material, undefined, uvs)
  return material
}

function shoreStudy(meshes: MeshFactory) {
  terrainSample(meshes, tidePool, 11, 9, 96, 'sand')
  const { x, z } = tidePool
  const water = createOceanMaterial(meshes.scene)
  meshes.surface('Shellglass water', [
    x - 5.5, waterLevel, z - 4.5, x + 5.5, waterLevel, z - 4.5,
    x + 5.5, waterLevel, z + 4.5, x - 5.5, waterLevel, z + 4.5,
  ], [0, 1, 2, 0, 2, 3], water.material)
  const random = seededRandom(63)
  for (let i = 0; i < 19; i++) {
    const px = x + (random() - .5) * 6.5, pz = z + (random() - .5) * 5.6
    const size = .12 + random() * .29
    meshes.sphere(px, groundHeight({ x: px, z: pz }) + .027, pz, size, size * .45, size * .82,
      i % 2 ? '#6a7c72' : '#cbbf9b', undefined, false)
  }
  return water.pose
}

const shoreStage = { group: 'Water and shore', source: 'src/ocean.ts', ground: { height: -1.9, color: '#5c7c77' },
  duration: 24, angle: -2.04, cameraBeta: .94, cameraRadius: 9.2, cameraFocus: [tidePool.x, waterLevel + .05, tidePool.z], weather: () => ({ hour: 11.5, rain: 0 }) } as const
const qualityControl = control('quality', 'Wave detail', 'full', { full: 'Full', low: 'Reduced' })

const windFocus = { x: meadowHill.x - 4, z: meadowHill.z - 4 }
function meadowStudy(meshes: MeshFactory) {
  const { x, z } = meadowHill
  const surface = terrainSample(meshes, { x, z: z - 4 }, 23, 23, 88, 'grass')
  const terrain = createMeadowSurface(surface)
  createTrail(meshes, meadowPath.name, meadowPath.points, meadowPath.width, meadowPath.surface, groundHeight)
  const random = seededRandom(226)
  const points = Array.from({ length: 370 }, () => {
    const px = x + (random() - .5) * 21
    return { x: px, z: z + (random() - .5) * 17 }
  }).filter(point => distanceToRoute(point, meadowPath.points) > 1.02)
  points.push(windFocus, { x: windFocus.x + .42, z: windFocus.z - .31 }, { x: windFocus.x - .4, z: windFocus.z + .3 })
  const blades = createMeadowBlades(meshes, points, groundHeight, 881)
  return (time: number, camera: Point & { y: number }, settings: typeof meadowDefaults) => {
    terrain(time, camera, settings)
    blades(time, camera, settings)
  }
}

const meadowStage = { group: 'Vegetation and terrain', source: 'src/meadow-shaders.ts', duration: 24, angle: -2.37,
  cameraBeta: 1.34, weather: () => ({ hour: 15, rain: 0 }) } as const

export const shaderStudies: Entry[] = [
  {
    ...shoreStage,
    id: 'shallow-water', name: 'Shallow water depth',
    description: 'At Shellglass, compare how much of the sill and the deeper basin remain visible through the water.',
    controls: [range('clarity', 'Water clarity', shoreDefaults.clarity, 0, 2.5, .05), qualityControl],
    actions: [comparison('Clouded water', { clarity: .25 }), comparison('Clear Water', shaderPresets.clearWater)],
    create(meshes) {
      const pose = shoreStudy(meshes)
      return ({ time, light, rain }, values) => pose(time, light, rain, {
        clarity: Number(values.clarity), foamReach: 0, quality: values.quality === 'low' ? 'low' : 'full',
      })
    },
  },
  {
    ...shoreStage,
    id: 'surf-foam', name: 'Shoreline surf foam',
    description: 'Use Shellglass Tide Pool to watch a broken foam front advance toward the sill and recede.',
    controls: [range('foamReach', 'Maximum wash depth (m)', shoreDefaults.foamReach, 0, .75, .01), qualityControl],
    actions: [comparison('Small wash', { foamReach: .12 }), comparison('Surf Wash', shaderPresets.surfWash)],
    create(meshes) {
      const pose = shoreStudy(meshes)
      return ({ time, light, rain }, values) => pose(time, light, rain, {
        ...shoreDefaults, foamReach: Number(values.foamReach), quality: values.quality === 'low' ? 'low' : 'full',
      })
    },
  },
  {
    ...meadowStage,
    id: 'foliage-wind', name: 'Rooted foliage wind',
    cameraBeta: 1.15, cameraRadius: 4.4, cameraFocus: [windFocus.x, groundHeight(windFocus) + .23, windFocus.z],
    description: 'Zoom into the meadow blades and scrub the gust. The stem holds its position as the tip bends.',
    controls: [range('gust', 'Gust strength', meadowDefaults.gust, 0, 1.8, .05)],
    actions: [comparison('Still air', { gust: 0 }), comparison('Sea Breeze', shaderPresets.seaBreeze)],
    create(meshes) {
      const pose = meadowStudy(meshes)
      return ({ time, camera }, values) => pose(time, camera, { ...meadowDefaults, gust: Number(values.gust), grassDistance: 90 })
    },
  },
  {
    ...meadowStage,
    id: 'meadow-distance', name: 'Meadow grass distance blend',
    description: 'Zoom out over the path and watch fine blades give way to irregular, world-aligned grass patches.',
    controls: [
      range('grassDistance', 'Blade fade ends (m)', meadowDefaults.grassDistance, 6, 80, 1),
      range('patchContrast', 'Patch contrast', meadowDefaults.patchContrast, 0, .55, .01),
    ],
    actions: [comparison('Blade detail', { grassDistance: 65, patchContrast: .1 }),
      comparison('Rolling Meadow', shaderPresets.rollingMeadow)],
    create(meshes) {
      const pose = meadowStudy(meshes)
      return ({ time, camera }, values) => pose(time, camera, {
        gust: meadowDefaults.gust, grassDistance: Number(values.grassDistance), patchContrast: Number(values.patchContrast),
      })
    },
  },
  {
    id: 'rain-paving', name: 'Rain-darkened paving', group: 'Weather and light', source: 'src/wet-paving.ts',
    description: 'Tilt along the Seabrook pavement sample to see damp concrete and broken sky reflections at grazing angles.',
    angle: -2.78, cameraBeta: 1.37, cameraRadius: 7.5, weather: () => ({ hour: 13, rain: 0 }),
    controls: [range('wetness', 'Surface wetness', 1, 0, 1, .01), range('reflection', 'Reflection strength', .72, 0, 1.5, .01)],
    actions: [comparison('Dry pavement', { wetness: 0 }), comparison('Rain Polished', shaderPresets.rainPolished)],
    create(meshes) {
      const concrete = createSurfaceMaterial(meshes.scene, 'concrete')
      const wetness = createWetPaving(concrete)
      createSidewalk(meshes, { name: 'Seabrook pavement sample', width: 3.2, points: [{ x: -4.5, z: 0 }, { x: 4.5, z: 0 }] }, concrete)
      meshes.box(0, -.1, 0, 9, .2, 6.8, meshes.paintSurface('grass'), undefined, false)
      return (_frame, values) => wetness(Number(values.wetness), Number(values.reflection))
    },
  },
  {
    id: 'dawn-mist', name: 'Low-angle light in mist', group: 'Weather and light', source: 'src/island-phenomena.ts',
    description: 'Orbit a Mirror Pool mist bank toward the dawn sun, then change the hour or compare scattering at the same angle.',
    angle: .30, cameraBeta: 1.52, cameraRadius: 23, duration: 24,
    weather: (_time, values) => ({ hour: Number(values.hour), rain: 0 }),
    controls: [
      range('hour', 'Island hour', 6.6, 4, 10, .1),
      range('mistDensity', 'Mist density', 1, 0, 1.5, .05),
      range('scattering', 'Forward scattering', 1.5, 0, 3, .1),
      control('quality', 'Mist layers', 'full', { full: 'Full', low: 'Reduced' }),
    ],
    actions: [comparison('Flat mist', { hour: 6.6, mistDensity: 1, scattering: 0 }),
      comparison('Dawn Silver', { hour: 6.6, ...shaderPresets.dawnSilver })],
    create(meshes) {
      const water = createOceanMaterial(meshes.scene, 'preview')
      meshes.box(0, .02, 0, 23, .06, 19, water.material, undefined, false)
      for (const [x, z, scale] of [[-9, 0, 1], [-7, -6, 1.65], [-3, 8, .8], [8, -5, .55]]) {
        meshes.sphere(x, .06, z, 3.4 * scale, .74 * scale, 2.9 * scale, '#647c66', undefined, false)
      }
      const pose = createPhenomena(meshes.scene, [
        { name: 'Mirror Pool dawn mist', kind: 'mist', x: 0, y: .04, z: 0, extent: 22, seed: 5182, scatter: true },
      ])
      return ({ time, camera, delta, light, seek }, values) => {
        water.pose(time, light)
        pose({ time, camera, delta, seek, weather: { hour: Number(values.hour), rain: 0 }, threats: [] }, {
          mistDensity: Number(values.mistDensity), scattering: Number(values.scattering), reduced: values.quality === 'low',
        })
      }
    },
  },
]
