import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createAudioEngine, type AudioEngine, type Point3 } from '../audio/engine'
import { metresPerCycle } from '../audio/gait'
import { crateCue, footstepCue, swellCue, swellSeconds, type CrateSurface, type FootSurface, type Rendered } from '../audio/recipes'
import { control, range, type Entry, type Values } from './subject'

// One audio context per Workbench page, created by the first Play click.
let shared: AudioEngine | undefined
const sharedAudio = () => shared ??= createAudioEngine()

type Layer = 'surf' | 'footsteps' | 'crate'
const layers: Layer[] = ['surf', 'footsteps', 'crate']
const listener = { x: 0, y: 1.6, z: 0 }
const forward = { x: 0, y: 0, z: 1 }

// Sources sit ahead and slightly to the right, so a spatial audition is audibly placed.
const source = (distance: number): Point3 => ({ x: distance * 0.5, y: 0.4, z: Math.max(0.5, distance * 0.87) })

const number = (values: Values, key: string, fallback: number) => typeof values[key] === 'number' ? values[key] : fallback

function cue(layer: Layer, values: Values, variant: number): Rendered {
  const seed = number(values, 'seed', 1) * 4 + variant % 4
  if (layer === 'surf') return swellCue({ strength: number(values, 'breaker', 0.5) }, seed)
  if (layer === 'footsteps') {
    const strength = Math.min(1, number(values, 'pace', 8) / 12)
    return footstepCue({ surface: String(values.surface) as FootSurface, strength }, seed)
  }
  return crateCue({ strength: number(values, 'impact', 0.6), surface: String(values.receiving) as CrateSurface }, seed)
}

// Seconds between repeated cues for each layer, from the same pacing the island uses.
function interval(layer: Layer, values: Values) {
  if (layer === 'surf') return 5.2 * number(values, 'spacing', 1) * (0.85 + Math.random() * 0.3)
  if (layer === 'footsteps') return metresPerCycle / 2 / Math.max(0.5, number(values, 'pace', 8))
  return 1.6
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
      bus: layer === 'surf' ? 'ambience' : 'effects', at,
      position: spatial ? source(number(values, 'distance', 6)) : undefined,
    })
    if (placed) last = `${layer} · ${rendered.key} · gain ${rendered.gain.toFixed(2)}`
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
        if (next[layer] - now > 0.25) continue
        const at = Math.max(now, next[layer])
        play(layer, values, at)
        next[layer] = at + (layer === 'surf' ? Math.min(interval(layer, values), swellSeconds(number(values, 'breaker', 0.5)) * 1.4) : interval(layer, values))
      }
    },
    describe(values: Values) {
      const mode = values.spatial !== false ? `${number(values, 'distance', 6)} m spatial` : 'unspatialised baseline'
      const muted = values.mute === true ? ' · muted' : ''
      return `Audio ${engine.state()}${muted} · ${repeating ? 'repeating' : 'single'} · ${mode} · voices ${engine.voices()} · ${last}`
    },
  }
}

let audition: ReturnType<typeof createAudition> | undefined
const activeAudition = () => audition ??= createAudition()

export const audioStudy: Entry = {
  id: 'starter-audio', name: 'Starter Island sound', group: 'Sound', source: 'src/audio/recipes.ts',
  description: 'Audition the surf, footstep and crate recipes used on Starter Island at a chosen seed and listening distance.',
  readout: 'Audition',
  duration: 8,
  angle: .9,
  ground: { height: 0, color: '#8e9b84' },
  controls: [
    control('layer', 'Sound layer', 'crate', { surf: 'Surf', footsteps: 'Footsteps', crate: 'Crate impact' }),
    { type: 'checkbox', key: 'solo', label: 'Solo layer', value: true },
    { type: 'number', key: 'seed', label: 'Seed', value: 1, min: 1, max: 9999, step: 1 },
    range('distance', 'Listener distance (m)', 6, 0, 60, 1),
    { type: 'checkbox', key: 'spatial', label: 'Spatial audition', value: true },
    range('breaker', 'Breaker strength', .5, 0, 1, .05),
    range('spacing', 'Breaker spacing (×)', 1, .6, 1.6, .05),
    control('surface', 'Footstep surface', 'gravel', { gravel: 'Gravel', sand: 'Sand', boards: 'Dock boards', fallback: 'Soft ground' }),
    range('pace', 'Walking pace (m/s)', 8, 2, 12, .5),
    range('impact', 'Drop strength', .6, 0, 1, .05),
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
    meshes.box(listener.x, 0.8, listener.z, 0.5, 1.6, 0.35, '#3b6f8f', stage)
    const emitter = meshes.sphere(0, 0, 0, 0.6, 0.6, 0.6, '#e2a648', stage)
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
