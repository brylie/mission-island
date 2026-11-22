import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { flatbedEngineDrive } from '../assets/audio/flatbed-engine'
import { foliageContact } from '../assets/audio/foliage'
import { audioStage } from '../assets/geometry/workbench-audio-stage'
import { islandSoundControls as c } from '../assets/recipes/workbench-audio-study'
import { birdCue, type BirdCall } from '../audio/bird-recipes'
import { createAudioEngine, type AudioEngine, type Point3 } from '../audio/engine'
import { foliageCue, type FoliageKind } from '../audio/foliage-recipes'
import { createTruckEngine } from '../audio/truck-engine'
import { createWindPlayer } from '../audio/wind-player'
import { control, range, type Entry, type Values } from './subject'

// One audio context per Workbench page, created by the first Play click.
let shared: AudioEngine | undefined
const sharedAudio = () => shared ??= createAudioEngine()

type Family = 'engine' | 'wind' | 'foliage' | 'birds'
const listener = { x: 0, y: audioStage.listener.y, z: 0 }
const forward = { x: 0, y: 0, z: 1 }
const auditionDuration = 8
const cueVariants = 4
const half = 0.5
const gainDigits = 2

function source(distance: number): Point3 {
  const { xRatio, height, minimumZ, zRatio } = audioStage.source
  return { x: distance * xRatio, y: height, z: Math.max(minimumZ, distance * zRatio) }
}

const number = (values: Values, key: string, fallback: number) => typeof values[key] === 'number' ? values[key] : fallback

// A one-shot brush: the same strength rule the island uses, from contact speed and plant stiffness.
function brushCue(values: Values, seed: number) {
  const kind = String(values.plant) as FoliageKind
  const pace = Math.min(1, number(values, 'contactSpeed', c.contactSpeed[0]) / foliageContact.fullSpeed)
  const stiffness = kind === 'trunk' ? 1 : foliageContact.plants[kind].stiffness
  return foliageCue({ kind, strength: kind === 'trunk' ? pace : pace * (half + half * stiffness) }, seed)
}

function createIslandAudition() {
  const engine = sharedAudio()
  const truck = createTruckEngine(engine)
  const wind = createWindPlayer(engine)
  let family: Family | null = null
  let repeating = false
  let next = 0
  let variant = 0
  let last = 'Nothing played yet'

  function oneShot(values: Values, at?: number) {
    const seed = number(values, 'seed', c.seed.value) * cueVariants + variant++ % cueVariants
    const rendered = family === 'birds' ? birdCue({ call: String(values.call) as BirdCall }, seed) : brushCue(values, seed)
    const position = values.spatial === false ? undefined : source(number(values, 'distance', c.distance[0]))
    if (engine.play(rendered, { bus: family === 'birds' ? 'ambience' : 'effects', at, position, lateness: c.lateness })) {
      last = `${rendered.key} · gain ${rendered.gain.toFixed(gainDigits)}`
    }
  }

  function stop() {
    family = null
    repeating = false
    truck.dispose()
    engine.stopAll()
  }

  return {
    // Each Play starts one family afresh, so a family chosen earlier never keeps playing underneath.
    start(values: Values, repeat: boolean) {
      engine.setListener(listener, forward)
      void engine.resumeFromGesture().then(() => {
        stop()
        family = String(values.family) as Family
        repeating = repeat
        next = engine.now()
        if (family === 'foliage' || family === 'birds') oneShot(values)
      })
    },
    stop,
    frame(values: Values, delta: number) {
      engine.setSettings({ ambience: 1, effects: 1, muted: values.mute === true })
      if (!family || engine.state() !== 'running') return
      const at = source(number(values, 'distance', c.distance[0]))
      if (family === 'engine') {
        // Effort is auditioned directly, as the pull it would take to produce it.
        const acceleration = number(values, 'effort', c.effort[0]) * flatbedEngineDrive.accelerationForFullEffort
        truck.frame({ running: values.running !== false, speed: number(values, 'speed', c.speed[0]), acceleration, braking: false, pitch: 0, crates: 0 }, at, delta, number(values, 'roughness', c.roughness[0]))
        last = `engine · effort ${truck.effort().toFixed(gainDigits)}`
      }
      if (family === 'wind') {
        const gust = values.followGusts === true ? undefined : number(values, 'gust', c.gust[0])
        const canopies = [{ x: at.x, z: at.z, height: audioStage.source.height, leafy: values.canopy !== 'needles' }]
        wind.frame(listener, engine.now(), 0, delta, { gust, exposure: number(values, 'exposure', c.exposure[0]), canopies })
        last = `wind · exposure ${number(values, 'exposure', c.exposure[0]).toFixed(gainDigits)}`
      }
      if (repeating && (family === 'foliage' || family === 'birds') && next - engine.now() < c.scheduleAheadSeconds) {
        next = Math.max(engine.now(), next) + c.repeatSeconds[family]
        oneShot(values, next)
      }
    },
    describe: () => `Audio ${engine.state()} · ${family ?? 'stopped'}${repeating ? ' · repeating' : ''} · voices ${engine.voices()} · ${last}`,
  }
}

let audition: ReturnType<typeof createIslandAudition> | undefined
const activeAudition = () => audition ??= createIslandAudition()

export const islandSoundStudy: Entry = {
  id: 'starter-island-sound-families',
  name: 'Island sound families',
  group: 'Sound',
  source: 'src/audio/recipes.ts',
  description: 'Audition the flatbed engine, open wind and canopy rustle, plant and bark contact, and gull and songbird calls at a chosen seed and distance.',
  readout: 'Audition',
  duration: auditionDuration,
  angle: audioStage.angle,
  ground: { height: 0, color: '#8e9b84' },
  controls: [
    control('family', 'Sound family', 'engine', { engine: 'Flatbed engine', wind: 'Wind and canopy', foliage: 'Plant and bark contact', birds: 'Gulls and songbirds' }),
    { type: 'number', key: 'seed', label: 'Seed', ...c.seed },
    range('distance', 'Listener distance (m)', ...c.distance),
    { type: 'checkbox', key: 'spatial', label: 'Spatial audition', value: true },
    { type: 'checkbox', key: 'running', label: 'Engine running', value: true },
    range('speed', 'Road speed (m/s)', ...c.speed),
    range('effort', 'Engine effort', ...c.effort),
    range('roughness', 'Idle roughness', ...c.roughness),
    { type: 'checkbox', key: 'followGusts', label: 'Follow island gusts', value: false },
    range('gust', 'Gust strength', ...c.gust),
    range('exposure', 'Exposure', ...c.exposure),
    control('canopy', 'Canopy', 'leaves', { leaves: 'Broadleaf', needles: 'Conifer' }),
    control('plant', 'Plant', 'fern', { fern: 'Juniper fern', rushes: 'Mirror Pool rushes', marram: 'Driftwood marram', trunk: 'Tree bark' }),
    range('contactSpeed', 'Contact speed (m/s)', ...c.contactSpeed),
    control('call', 'Call', 'kek', { kek: 'Gull kek', mew: 'Gull mew', flap: 'Gull wings', song: 'Songbird phrase' }),
    { type: 'checkbox', key: 'mute', label: 'Mute', value: false },
  ],
  actions: [
    { label: 'Play', enabled: () => true, run: (values) => activeAudition().start(values, false) },
    { label: 'Repeat', enabled: () => true, run: (values) => activeAudition().start(values, true) },
    { label: 'Stop', enabled: () => true, run: () => activeAudition().stop() },
  ],
  create(meshes, values, _reportError, observe) {
    const stage = new TransformNode('Island sound study', meshes.scene)
    const { listener: listenerMarker, source: emitterMarker } = audioStage
    meshes.box(listener.x, listenerMarker.boxY, listener.z, ...listenerMarker.boxSize, listenerMarker.color, stage)
    const emitter = meshes.sphere(0, 0, 0, ...emitterMarker.size, emitterMarker.color, stage)
    const current = activeAudition()
    meshes.scene.onDisposeObservable.addOnce(() => {
      current.stop()
      audition = undefined
    })
    return ({ delta }, live) => {
      const at = source(number(live, 'distance', values.distance as number))
      emitter.position.set(at.x, at.y, at.z)
      current.frame(live, delta)
      observe(current.describe())
    }
  },
}
