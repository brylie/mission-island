import type { Scene } from '@babylonjs/core/scene'
import type { MeshFactory } from '../island-meshes'
import { createParticleEffect } from '../particle-effect'
import { particleBurst, type Particle, type ParticleTuning } from '../particle-motion'
import { gameplayParticleRecipes } from '../assets/recipes/particle-gameplay-recipes'
import { lookoutParticleHeights, particleRecipes, type ParticleRecipe } from '../assets/recipes/particle-recipes'
import { particleAccents, shelfParticleRecipes as expandedRecipes } from '../assets/recipes/particle-shelf-recipes'
import { effectStudyPresets, effectControlsPreset, effectStage, effectTimeline } from '../assets/recipes/workbench-effect-studies'
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
    ...effectStudyPresets.waterfallSpray,
    seed: tarnstepSpraySeed,
    field: tarnstep,
    fixture: (meshes, _, field) => waterfallFixture(meshes, field),
  },
  { ...effectStudyPresets.shoreSplash, fixture: shoreFixture },
  { ...effectStudyPresets.paddleDroplets, fixture: paddleFixture },
  { ...effectStudyPresets.rainStreaks, fixture: rainFixture },
  { ...effectStudyPresets.roofDrips, fixture: roofFixture },
  { ...effectStudyPresets.groundMist, fixture: mistFixture },
  { ...effectStudyPresets.windblownLeaves, fixture: leavesFixture },
  { ...effectStudyPresets.pollenMotes, fixture: pollenFixture },
  { ...effectStudyPresets.trackDust, fixture: (meshes) => dustFixture(meshes) },
  {
    ...effectStudyPresets.fire,
    field: forestLookout,
    fixture: (meshes, _, field) => fireFixture(meshes, lookoutParticleHeights.embers, field),
  },
  {
    ...effectStudyPresets.risingSmoke,
    field: forestLookout,
    fixture: (meshes, _, field) => fireFixture(meshes, lookoutParticleHeights.smoke, field),
  },
  {
    ...effectStudyPresets.extinguisher,
    field: forestLookout,
    fixture: (meshes, values) => extinguisherFixture(meshes, Boolean(values.busy)),
  },
]

const { opening, stopping, duration, onsetDuration, continuousStart } = effectTimeline
const { seedStride, defaultAngle, fireDrillTruck, framing } = effectStage
const halves = 2

function effectControls(study: EffectStudy): Control[] {
  const { rateLimits, strength, footprint, wind, seed } = effectControlsPreset
  const primary = study.id === 'extinguisher'
    ? range('rate', study.strength, particleRecipes.extinguisher.rate, ...rateLimits)
    : range(study.id === 'fire' ? 'intensity' : 'strength', study.strength, ...strength)
  const controls: Control[] = [primary, range('footprint', study.footprint + ' (×)', ...footprint)]
  if (study.wind) controls.push(range('wind', 'Wind', ...wind))
  controls.push({ type: 'number', key: 'seed', label: 'Replay seed', value: study.seed, ...seed })
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
  const dust = dustFixture(meshes, fireDrillTruck.x, fireDrillTruck.z)
  return [
    previewEmitter(meshes.scene, particleRecipes.fire, 'Fire drill embers', effectStudyPresets.fire.seed, embers),
    previewEmitter(meshes.scene, particleRecipes['rising-smoke'], 'Fire drill smoke', effectStudyPresets.risingSmoke.seed, smoke),
    previewEmitter(meshes.scene, particleRecipes['track-dust'], 'Fire drill track dust', effectStudyPresets.trackDust.seed, dust),
  ]
}

function playbackLabel(time: number, count: number, mode: Values[string]) {
  if (mode === 'idle') return 'Off'
  if (mode === 'continuous') return 'Continuous'
  if (time < opening) return 'Ready'
  if (time < opening + onsetDuration) return 'Onset'
  if (time < stopping) return 'Peak window'
  return count ? 'Decay' : 'Cleared'
}

function recipeSource(id: EffectId) {
  if (id in gameplayParticleRecipes) return 'src/assets/recipes/particle-gameplay-recipes.ts'
  return id in expandedRecipes ? 'src/assets/recipes/particle-shelf-recipes.ts' : 'src/assets/recipes/particle-recipes.ts'
}

export const effectStudies: Entry[] = [...studies, ...expandedEffectStudies, ...gameplayEffectStudies].map((study) => ({
  id: study.id,
  name: study.name,
  group: study.group,
  description: study.description,
  source: recipeSource(study.id),
  duration,
  angle: study.angle ?? defaultAngle,
  ground: study.ground,
  fieldSite: study.field ? () => study.field! : undefined,
  readout: 'Particle playback',
  controls: effectControls(study),
  create(meshes, values, _, observe, field) {
    const fixture = study.fixture(meshes, values, field)
    const plume = study.id === 'extinguisher'
    const busy = plume && Boolean(values.busy)
    const width = busy ? framing.drill.width : field === tarnstep ? framing.tarnstepWidth : study.width ?? framing.width
    const height = study.id === 'rising-smoke' || busy ? framing.smokeHeight : study.height ?? framing.height
    const extent = meshes.box(
      busy ? framing.drill.x : 0,
      study.height === undefined ? framing.y : height / halves - framing.heightInset,
      plume ? framing.plume.z : 0,
      width,
      height,
      plume ? framing.plume.depth : width,
      '#ffffff',
      undefined,
      false,
    )
    extent.isVisible = false
    const primary = previewEmitter(meshes.scene, particleRecipes[study.id], study.name, study.seed, fixture)
    const accents = (fixture.accents ?? []).map(({ id, sourceAt }, index) =>
      previewEmitter(meshes.scene, particleAccents[id], id, study.seed + (index + 1) * seedStride, { sourceAt }))
    const companion = busy ? fireDrill(meshes, field) : []
    let peak = 0
    let previous = -1
    return ({ time, seek }, options) => {
      if (!seek && time === previous) return
      if (seek || time < previous) {
        const enabled = options.enabled !== false && options.mode !== 'idle'
        const strength = Number(plume ? Number(options.rate) / particleRecipes.extinguisher.rate : options.intensity ?? options.strength)
        const start = options.mode === 'continuous' ? continuousStart : opening
        const stop = options.mode === 'continuous' ? duration : stopping
        const tuning = { strength: enabled ? strength : 0, footprint: Number(options.footprint), wind: Number(options.wind ?? 0) }
        const seed = Number(options.seed)
        primary.setBurst(start, stop, tuning, seed)
        accents.forEach((effect, index) => void effect.setBurst(start, stop, tuning, seed + (index + 1) * seedStride))
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
