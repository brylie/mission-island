import type { Scene } from '@babylonjs/core/scene'
import type { MeshFactory } from '../island-meshes'
import { createParticleEffect } from '../particle-effect'
import { particleBurst, type Particle, type ParticleTuning } from '../particle-motion'
import { gameplayParticleRecipes } from '../assets/particle-gameplay-recipes'
import { lookoutParticleHeights, particleRecipes, type ParticleRecipe } from '../assets/particle-recipes'
import { particleAccents, shelfParticleRecipes as expandedRecipes } from '../assets/particle-shelf-recipes'
import { tarnstepSpraySeed, tarnstepSpraySource } from '../second-island/tarnstep-spray'
import { groundHeight } from '../terrain'
import { lookout } from '../world'
import {
  dustFixture,
  extinguisherFixture,
  fireFixture,
  leavesFixture,
  mistFixture,
  paddleFixture,
  pollenFixture,
  rainFixture,
  roofFixture,
  shoreFixture,
  waterfallFixture,
  worldSource,
} from './effect-fixtures'
import type { Fixture } from './effect-fixtures'
import type { FieldSite } from './field-site'
import { expandedEffectStudies } from './expanded-effect-studies'
import { gameplayEffectStudies } from './gameplay-effect-studies'
import { control, range, type Control, type Entry, type Values } from './subject'

type EffectId = keyof typeof particleRecipes

export interface EffectStudy {
  id: EffectId
  name: string
  group: Entry['group']
  description: string
  seed: number
  strength: string
  footprint: string
  angle?: number
  width?: number
  height?: number
  ground?: Entry['ground']
  wind?: boolean
  field?: FieldSite
  fixture(meshes: MeshFactory, values: Values, field?: FieldSite): Fixture
}

const tarnstep: FieldSite = { name: 'Tarnstep Falls', saltwindSubject: 'waterfall-spray', offset: tarnstepSpraySource }
const forestLookout: FieldSite = { name: 'Forest Lookout', offset: { ...lookout, y: groundHeight(lookout) } }
const studies: EffectStudy[] = [
  {
    id: 'waterfall-spray',
    name: 'Waterfall spray',
    group: 'Water',
    seed: tarnstepSpraySeed,
    angle: -1.33,
    width: 9,
    description: 'Soft white spray lifts from the plunge pool and drifts downstream. Use below the drops at Tarnstep Falls.',
    strength: 'Spray volume',
    footprint: 'Spray reach',
    field: tarnstep,
    fixture: (meshes, _, field) => waterfallFixture(meshes, field),
  },
  {
    id: 'shore-splash',
    name: 'Shore splash',
    group: 'Water',
    seed: 4180,
    angle: 0.74,
    width: 5.5,
    description: 'A low fan of droplets arcs back onto the beach. Use where a wave meets the rocks at Driftwood Beach.',
    strength: 'Wave strength',
    footprint: 'Splash width',
    fixture: shoreFixture,
  },
  {
    id: 'paddle-droplets',
    name: 'Paddle droplets',
    group: 'Water',
    seed: 8602,
    angle: 0.37,
    description: 'Droplets follow the paddle blade through the splash zone, then drop behind it. Use on a skiff downstroke.',
    strength: 'Water shed',
    footprint: 'Droplet spread',
    fixture: paddleFixture,
  },
  {
    id: 'rain-streaks',
    name: 'Rain streaks',
    group: 'Weather and air',
    seed: 7392,
    wind: true,
    description: 'Short streaks blow diagonally through an open volume. Use in a shower over a wet path.',
    strength: 'Rainfall',
    footprint: 'Shower width',
    fixture: rainFixture,
  },
  {
    id: 'roof-drips',
    name: 'Roof drips',
    group: 'Weather and air',
    seed: 8354,
    angle: 0.63,
    width: 5.1,
    description: 'Heavy drops separate at the eave and accelerate to the ground. Use under a leaking gutter after rain.',
    strength: 'Runoff',
    footprint: 'Dripping eave width',
    fixture: roofFixture,
  },
  {
    id: 'ground-mist',
    name: 'Ground mist wisps',
    group: 'Weather and air',
    seed: 5183,
    wind: true,
    angle: 0.79,
    description: 'Broad wisps creep between stones at ankle height. Use on the banks of Mirror Lake at dawn.',
    strength: 'Mist density',
    footprint: 'Mist coverage',
    fixture: mistFixture,
  },
  {
    id: 'windblown-leaves',
    name: 'Windblown leaves',
    group: 'Vegetation and loose ground',
    seed: 3721,
    wind: true,
    width: 5.7,
    description: 'Individual leaves tumble sideways as they fall. Use below an exposed alder on a windy verge.',
    strength: 'Loose leaves',
    footprint: 'Leaf scatter',
    fixture: leavesFixture,
  },
  {
    id: 'pollen-motes',
    name: 'Pollen motes',
    group: 'Vegetation and loose ground',
    seed: 4475,
    wind: true,
    width: 4.7,
    description: 'Gold motes lift slowly between the flower heads. Use in a sunlit patch beside the Long Acre orchard.',
    strength: 'Pollen density',
    footprint: 'Flower patch width',
    fixture: pollenFixture,
  },
  {
    id: 'track-dust',
    name: 'Track dust',
    group: 'Vegetation and loose ground',
    seed: 7482,
    angle: -0.87,
    width: 9,
    description: 'A spinning rear tyre throws warm, expanding dust low over the gravel. Use above a dry flatbed wheel track.',
    strength: 'Dustiness',
    footprint: 'Dust trail reach',
    fixture: (meshes) => dustFixture(meshes),
  },
  {
    id: 'fire',
    name: 'Small fire embers',
    group: 'Jobs',
    seed: 1294,
    width: 4.8,
    description: 'Pinpricks lift from a small fire and cool to red as they fall away. Use on the burning verge at Forest Lookout.',
    strength: 'Ember intensity',
    footprint: 'Ember scatter',
    field: forestLookout,
    fixture: (meshes, _, field) => fireFixture(meshes, lookoutParticleHeights.embers, field),
  },
  {
    id: 'rising-smoke',
    name: 'Rising smoke',
    group: 'Jobs',
    seed: 1293,
    wind: true,
    description: 'Dense grey puffs rise and expand into a downwind column. Use over the active fire at Forest Lookout.',
    strength: 'Smoke density',
    footprint: 'Column width',
    field: forestLookout,
    fixture: (meshes, _, field) => fireFixture(meshes, lookoutParticleHeights.smoke, field),
  },
  {
    id: 'extinguisher',
    name: 'Extinguisher plume',
    group: 'Jobs',
    seed: 9011,
    angle: -0.73,
    description: 'A short pressure burst widens from the extinguisher nozzle. Use while suppressing the Forest Lookout fire.',
    strength: 'Spray volume (particles/s)',
    footprint: 'Plume reach',
    field: forestLookout,
    fixture: (meshes, values) => extinguisherFixture(meshes, Boolean(values.busy)),
  },
]

const opening = 0.25
const stopping = 2.9
const duration = 6.25

function effectControls(study: EffectStudy): Control[] {
  const primary = study.id === 'extinguisher'
    ? range('rate', study.strength, particleRecipes.extinguisher.rate, 0, 310, 5)
    : range(study.id === 'fire' ? 'intensity' : 'strength', study.strength, 1, 0, 2, 0.05)
  const controls: Control[] = [primary, range('footprint', study.footprint + ' (×)', 1, 0.5, 1.5, 0.05)]
  if (study.wind) controls.push(range('wind', 'Wind', 0, -0.5, 1, 0.05))
  controls.push({ type: 'number', key: 'seed', label: 'Replay seed', value: study.seed, min: 1, max: 9999, step: 1 })
  if (study.id === 'extinguisher') controls.push(
    control('mode', 'Emission', 'burst', { burst: 'Burst loop', continuous: 'Continuous', idle: 'Off' }),
    { type: 'checkbox', key: 'busy', label: 'Busy fire drill', value: false, rebuild: true },
    { type: 'checkbox', key: 'enabled', label: 'Show particles', value: true },
  )
  return controls
}

function previewEmitter(scene: Scene, recipe: ParticleRecipe, label: string, seed: number, fixture: Fixture) {
  fixture.pose?.(0)
  const effect = createParticleEffect(scene, label, recipe, seed)
  let particles: Particle[] = []
  return {
    setBurst(start: number, stop: number, tuning: ParticleTuning, replaySeed = seed) {
      particles = particleBurst(recipe, replaySeed, start, stop, tuning, fixture.sourceAt)
    },
    draw(time: number) {
      fixture.pose?.(time)
      return effect.draw(time, particles)
    },
  }
}

function fireDrill(meshes: MeshFactory, field?: FieldSite) {
  const smoke = { sourceAt: () => worldSource({ x: 0, y: lookoutParticleHeights.smoke, z: 0 }, field) }
  const embers = { sourceAt: () => worldSource({ x: 0, y: lookoutParticleHeights.embers, z: 0 }, field) }
  const dust = dustFixture(meshes, -4, -1)
  return [
    previewEmitter(meshes.scene, particleRecipes.fire, 'Fire drill embers', 1294, embers),
    previewEmitter(meshes.scene, particleRecipes['rising-smoke'], 'Fire drill smoke', 1293, smoke),
    previewEmitter(meshes.scene, particleRecipes['track-dust'], 'Fire drill track dust', 7482, dust),
  ]
}

function playbackLabel(time: number, count: number, mode: Values[string]) {
  if (mode === 'idle') return 'Off'
  if (mode === 'continuous') return 'Continuous'
  if (time < opening) return 'Ready'
  if (time < opening + 0.65) return 'Onset'
  if (time < stopping) return 'Peak window'
  return count ? 'Decay' : 'Cleared'
}

function recipeSource(id: EffectId) {
  if (id in gameplayParticleRecipes) return 'src/assets/particle-gameplay-recipes.ts'
  return id in expandedRecipes ? 'src/assets/particle-shelf-recipes.ts' : 'src/assets/particle-recipes.ts'
}

export const effectStudies: Entry[] = [...studies, ...expandedEffectStudies, ...gameplayEffectStudies].map((study) => ({
  id: study.id,
  name: study.name,
  group: study.group,
  description: study.description,
  source: recipeSource(study.id),
  duration,
  angle: study.angle ?? 0.88,
  ground: study.ground,
  fieldSite: study.field ? () => study.field! : undefined,
  readout: 'Particle playback',
  controls: effectControls(study),
  create(meshes, values, _, observe, field) {
    const fixture = study.fixture(meshes, values, field)
    const plume = study.id === 'extinguisher'
    const busy = plume && Boolean(values.busy)
    const width = busy ? 12 : field === tarnstep ? 6.2 : study.width ?? 7
    const height = study.id === 'rising-smoke' || busy ? 8 : study.height ?? 4.8
    const extent = meshes.box(busy ? -1.4 : 0, study.height === undefined ? 1.9 : height / 2 - 0.24, plume ? -1 : 0, width, height, plume ? 8 : width, '#ffffff', undefined, false)
    extent.isVisible = false
    const primary = previewEmitter(meshes.scene, particleRecipes[study.id], study.name, study.seed, fixture)
    const accents = (fixture.accents ?? []).map(({ id, sourceAt }, index) =>
      previewEmitter(meshes.scene, particleAccents[id], id, study.seed + (index + 1) * 307, { sourceAt }))
    const companion = busy ? fireDrill(meshes, field) : []
    let peak = 0
    let previous = -1
    return ({ time, seek }, options) => {
      if (!seek && time === previous) return
      if (seek || time < previous) {
        const enabled = options.enabled !== false && options.mode !== 'idle'
        const strength = Number(plume ? Number(options.rate) / particleRecipes.extinguisher.rate : options.intensity ?? options.strength)
        const start = options.mode === 'continuous' ? -1 : opening
        const stop = options.mode === 'continuous' ? duration : stopping
        const tuning = { strength: enabled ? strength : 0, footprint: Number(options.footprint), wind: Number(options.wind ?? 0) }
        const seed = Number(options.seed)
        primary.setBurst(start, stop, tuning, seed)
        accents.forEach((effect, index) => void effect.setBurst(start, stop, tuning, seed + (index + 1) * 307))
        for (const effect of companion) effect.setBurst(start, stop, { strength: Number(enabled), footprint: 1 })
        peak = 0
      }
      previous = time
      let count = primary.draw(time)
      for (const effect of accents) count += effect.draw(time)
      for (const effect of companion) count += effect.draw(time)
      peak = Math.max(peak, count)
      const label = playbackLabel(time, count, options.enabled === false ? 'idle' : options.mode)
      const emitters = 1 + accents.length + companion.length
      observe(`${label} · ${count} live · ${peak} peak observed · ${emitters} emitter${emitters === 1 ? '' : 's'}`)
    }
  },
}))
