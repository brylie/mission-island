import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { audioStage } from '../assets/geometry/workbench-audio-stage'
import { auditionControls } from '../assets/recipes/workbench-audio-study'
import { baseSwellSpacingSeconds, maximumSwellIntervalRatio } from '../audio/surf-player'
import { createAudioEngine, type AudioEngine, type Point3 } from '../audio/engine'
import { crewSwing, strideCycleMetres } from '../island-render-pose'
import { crateCue, footstepCue, swellCue, swellSeconds, type CrateSurface, type FootSurface, type Rendered } from '../audio/recipes'
import { control, range, type Entry, type Values } from './subject'

// One audio context per Workbench page, created by the first Play click.
let shared: AudioEngine | undefined
const sharedAudio = () => shared ??= createAudioEngine()

type Layer = 'surf' | 'footsteps' | 'crate'
const layers: Layer[] = ['surf', 'footsteps', 'crate']
const listener = { x: 0, y: audioStage.listener.y, z: 0 }
const auditionDuration = 8
const cueVariants = 4
const minimumStepPace = 0.5
const stepsPerStride = 2
const repeatCrateSeconds = 1.6
const swellJitterStart = 0.85
const swellJitterRange = 0.3
const auditionLateness = 2
const scheduleAheadSeconds = 0.25
const gainDisplayDigits = 2
const forward = { x: 0, y: 0, z: 1 }

// Sources sit ahead and slightly to the right, so a spatial audition is audibly placed.
function source(distance: number): Point3 {
  const { xRatio, height, minimumZ, zRatio } = audioStage.source
  return { x: distance * xRatio, y: height, z: Math.max(minimumZ, distance * zRatio) }
}

const number = (values: Values, key: string, fallback: number) => typeof values[key] === 'number' ? values[key] : fallback

function cue(layer: Layer, values: Values, variant: number): Rendered {
  const seed = number(values, 'seed', auditionControls.seed.value) * cueVariants + variant % cueVariants
  if (layer === 'surf') return swellCue({ strength: number(values, 'breaker', auditionControls.breaker[0]) }, seed)
  if (layer === 'footsteps') {
    const strength = Math.min(1, number(values, 'pace', auditionControls.pace[0]) / auditionControls.pace[2])
    return footstepCue({ surface: String(values.surface) as FootSurface, strength, damp: values.damp === true }, seed)
  }
  return crateCue({ strength: number(values, 'impact', auditionControls.impact[0]), surface: String(values.receiving) as CrateSurface }, seed)
}

// Seconds between repeated cues for each layer, from the same pacing the island uses.
function interval(layer: Layer, values: Values) {
  if (layer === 'surf') return baseSwellSpacingSeconds * number(values, 'spacing', auditionControls.spacing[0]) * (swellJitterStart + Math.random() * swellJitterRange)
  if (layer === 'footsteps') {
    // Half a walk cycle at this pace, matching the legs in the game.
    const pace = Math.max(minimumStepPace, number(values, 'pace', auditionControls.pace[0]))
    return strideCycleMetres(crewSwing(pace)) / stepsPerStride / pace
  }
  return repeatCrateSeconds
}

function createAudition() {
  const engine = sharedAudio()
  const next: Record<Layer, number> = { surf: 0, footsteps: 0, crate: 0 }
  let repeating = false
  let variant = 0
  let last = 'Nothing played yet'

  function play(layer: Layer, values: Values, at?: number) {
    const rendered = cue(layer, values, variant++)
    const spatial = values.spatial !== false
    const placed = engine.play(rendered, {
      // An audition waits for a buffer rendered on demand rather than skipping the cue.
      bus: layer === 'surf' ? 'ambience' : 'effects',
      at,
      lateness: auditionLateness,
      position: spatial ? source(number(values, 'distance', auditionControls.distance[0])) : undefined,
    })
    if (placed) last = `${layer} · ${rendered.key} · gain ${rendered.gain.toFixed(gainDisplayDigits)}`
  }

  function playing(values: Values) {
    return values.solo !== false ? [values.layer as Layer] : layers
  }

  return {
    start(values: Values, repeat: boolean) {
      engine.setSettings({ ambience: 1, effects: 1, muted: values.mute === true })
      engine.setListener(listener, forward)
      void engine.resumeFromGesture().then(() => {
        const now = engine.now()
        repeating = repeat
        for (const layer of playing(values)) {
          play(layer, values)
          next[layer] = now + interval(layer, values)
        }
      })
    },
    stop() {
      repeating = false
      engine.stopAll()
    },
    frame(values: Values) {
      engine.setSettings({ ambience: 1, effects: 1, muted: values.mute === true })
      if (!repeating || engine.state() !== 'running') return
      const now = engine.now()
      for (const layer of playing(values)) {
        if (next[layer] - now > scheduleAheadSeconds) continue
        const at = Math.max(now, next[layer])
        play(layer, values, at)
        next[layer] = at + (layer === 'surf' ? Math.min(interval(layer, values), swellSeconds(number(values, 'breaker', auditionControls.breaker[0])) * maximumSwellIntervalRatio) : interval(layer, values))
      }
    },
    describe(values: Values) {
      const mode = values.spatial !== false ? `${number(values, 'distance', auditionControls.distance[0])} m spatial` : 'unspatialised baseline'
      const muted = values.mute === true ? ' · muted' : ''
      return `Audio ${engine.state()}${muted} · ${repeating ? 'repeating' : 'single'} · ${mode} · voices ${engine.voices()} · ${last}`
    },
  }
}

let audition: ReturnType<typeof createAudition> | undefined
const activeAudition = () => audition ??= createAudition()

export const audioStudy: Entry = {
  id: 'starter-audio',
  name: 'Starter Island sound',
  group: 'Sound',
  source: 'src/audio/recipes.ts',
  description: 'Audition the surf, footstep and crate recipes used on Starter Island at a chosen seed and listening distance.',
  readout: 'Audition',
  duration: auditionDuration,
  angle: audioStage.angle,
  ground: { height: 0, color: '#8e9b84' },
  controls: [
    control('layer', 'Sound layer', 'crate', { surf: 'Surf', footsteps: 'Footsteps', crate: 'Crate impact' }),
    { type: 'checkbox', key: 'solo', label: 'Solo layer', value: true },
    { type: 'number', key: 'seed', label: 'Seed', ...auditionControls.seed },
    range('distance', 'Listener distance (m)', ...auditionControls.distance),
    { type: 'checkbox', key: 'spatial', label: 'Spatial audition', value: true },
    range('breaker', 'Breaker strength', ...auditionControls.breaker),
    range('spacing', 'Breaker spacing (×)', ...auditionControls.spacing),
    control('surface', 'Footstep surface', 'gravel', { gravel: 'Gravel', sand: 'Sand', boards: 'Dock boards', pavement: 'Pavement', grass: 'Grass', litter: 'Leaf litter', shallows: 'Shallow water', fallback: 'Bare earth' }),
    { type: 'checkbox', key: 'damp', label: 'Soaked ground', value: false },
    range('pace', 'Walking pace (m/s)', ...auditionControls.pace),
    range('impact', 'Drop strength', ...auditionControls.impact),
    control('receiving', 'Receiving surface', 'ground', { ground: 'Ground', bed: 'Truck bed' }),
    { type: 'checkbox', key: 'mute', label: 'Mute', value: false },
  ],
  actions: [
    { label: 'Play', enabled: () => true, run: (values) => activeAudition().start(values, false) },
    { label: 'Repeat', enabled: () => true, run: (values) => activeAudition().start(values, true) },
    { label: 'Stop', enabled: () => true, run: () => activeAudition().stop() },
  ],
  create(meshes, values, _reportError, observe) {
    const stage = new TransformNode('Audio study', meshes.scene)
    const { listener: listenerMarker, source: emitterMarker } = audioStage
    meshes.box(listener.x, listenerMarker.boxY, listener.z, ...listenerMarker.boxSize, listenerMarker.color, stage)
    const emitter = meshes.sphere(0, 0, 0, ...emitterMarker.size, emitterMarker.color, stage)
    const current = activeAudition()
    meshes.scene.onDisposeObservable.addOnce(() => {
      current.stop()
      audition = undefined
    })
    return (_frame, live) => {
      const at = source(number(live, 'distance', values.distance as number))
      emitter.position.set(at.x, at.y, at.z)
      current.frame(live)
      observe(current.describe(live))
    }
  },
}
