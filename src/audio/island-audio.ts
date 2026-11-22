import type { Player, ServerMessage, Snapshot, Weather } from '../protocol.ts'
import { createAudioEngine, type Point3 } from './engine.ts'
import { createImpactInbox } from './impact-inbox.ts'
import { footstepRecipe } from '../assets/audio/footsteps.ts'
import type { SoundSettings } from './mix.ts'
import { crateCue, footstepCue, swellCue, type Rendered } from './recipes.ts'
import { footGround } from './surface.ts'
import type { FootSurface } from './footstep-recipes.ts'
import { createSurfPlayer, swellSeed, swellVariants } from './surf-player.ts'
import { createTruckEngine } from './truck-engine.ts'
import { createWindPlayer } from './wind-player.ts'
import { windCue } from './wind-recipes.ts'
import { createFoliageContacts } from './foliage-contact.ts'
import { foliageCue, type FoliageKind } from './foliage-recipes.ts'
import { createBirdCalls } from './bird-calls.ts'
import { birdCue } from './bird-recipes.ts'
import type { UnderstoryPlant } from '../island-wildlife.ts'
import { engineInputs } from './truck-engine-model.ts'
import { motorCue } from './motor-recipes.ts'
import { flatbedEngineDrive } from '../assets/audio/flatbed-engine.ts'
import { surfVoices } from './shore.ts'

const softFootstepStrength = 0.15
const mediumFootstepStrength = 0.5
const firmFootstepStrength = 0.85
const clearWeatherSurfStrength = 0.42
const rainSurfStrengthGain = 0.4
const footfallEmitterLiftMetres = 0.1
const localFootstepGain = 0.7

export type CrateImpactNotice = Extract<ServerMessage, { type: 'crate-impact' }>

// What the renderer hands the mix each frame. Time is the smoothed island clock the visible effects use,
// so wind and wildlife sounds stay in step with what players see.
type AudioFrame = {
  listener: Point3
  forward: Point3
  weather: Weather
  time: number
  weatherAt?: (time: number) => Weather
  delta: number
  state?: Snapshot
  truckAt?: Point3
}

const variants = 4
const foliageKinds: FoliageKind[] = ['fern', 'rushes', 'marram', 'trunk']
const footSurfaces: FootSurface[] = ['gravel', 'sand', 'boards', 'pavement', 'grass', 'litter', 'shallows', 'fallback']
// Rain at which footsteps start to sound soaked; damp variants are rendered ahead only in rain.
const dampWarmRain = 0.3
// Walking pace in metres per second, where footsteps reach full strength.
const brisk = 12
// One level inside each strength tier, used to render every variant ahead of need.
const tierLevels = [softFootstepStrength, mediumFootstepStrength, firmFootstepStrength]

const surfStrength = (rain: number) => clearWeatherSurfStrength + Math.min(1, Math.max(0, rain)) * rainSurfStrengthGain

// Every footstep, crate and current surf variant, rendered in the background once audio starts,
// so no cue in play waits on a buffer.
function islandVariants(rain: number) {
  const cues: Rendered[] = []
  for (const layer of ['low', 'high', 'leaves', 'needles'] as const) cues.push(windCue({ layer }, 1))
  for (const call of ['kek', 'mew', 'flap', 'song'] as const) for (let seed = 0; seed < variants; seed++) cues.push(birdCue({ call }, seed))
  for (const layer of ['idle', 'load'] as const) cues.push(motorCue({ layer, roughness: flatbedEngineDrive.roughness }, 1))
  for (let voice = 0; voice < surfVoices; voice++) {
    for (let count = 0; count < swellVariants; count++) cues.push(swellCue({ strength: surfStrength(rain) }, swellSeed(count, voice)))
  }
  for (const strength of tierLevels) {
    for (const kind of foliageKinds) for (let seed = 0; seed < variants; seed++) cues.push(foliageCue({ kind, strength }, seed))
    for (let seed = 0; seed < variants; seed++) {
      for (const surface of footSurfaces) {
        cues.push(footstepCue({ surface, strength }, seed))
        if (rain >= dampWarmRain || surface === 'sand') cues.push(footstepCue({ surface, strength, damp: true }, seed))
      }
      for (const surface of ['ground', 'bed'] as const) cues.push(crateCue({ strength, surface }, seed))
    }
  }
  return cues
}

// Sound must never stop the game. A failing audio step is reported once and skipped, and the render
// loop that called it carries on.
function guardAudio() {
  let reported = false
  return <A extends unknown[]>(step: (...args: A) => void) => (...args: A) => {
    try {
      step(...args)
    }
    catch (error) {
      if (!reported) console.error('Island audio skipped a step', error)
      reported = true
    }
  }
}

// Starter Island's client mix: owns the audio context, its gesture and visibility lifecycle,
// and turns host notices and local world state into cues.
export function createIslandAudio(target: Window = window, plants: readonly UnderstoryPlant[] = []) {
  const engine = createAudioEngine()
  const guarded = guardAudio()
  const inbox = createImpactInbox(() => performance.now())
  let revision: number | undefined
  const steps = new Map<number, number>()
  const lastStep = new Map<number, number>()
  const surf = createSurfPlayer(engine)
  const truck = createTruckEngine(engine)
  const wind = createWindPlayer(engine)
  const birds = createBirdCalls(engine)
  const foliage = createFoliageContacts(plants)
  let brushes = 0
  let rain = 0
  let truckSpeed: number | undefined
  engine.onState((state) => {
    if (state === 'running') engine.warm(islandVariants(rain))
  })

  // Every pointer or key press is a chance to unlock audio; resume must happen inside the handler.
  const wake = () => void engine.resumeFromGesture()
  const visibility = () => {
    engine.setHidden(target.document.hidden)
    if (!target.document.hidden) inbox.reset()
  }
  target.addEventListener('pointerdown', wake, true)
  target.addEventListener('keydown', wake, true)
  target.document.addEventListener('visibilitychange', visibility)

  return {
    engine,
    // A reconnect or checkpoint restart begins a new listening run and silences what came before.
    resetRun() {
      engine.stopAll()
      inbox.reset()
    },
    snapshot(next: Snapshot) {
      const current = next.playtest?.revision
      if (current !== revision) {
        if (revision !== undefined) this.resetRun()
        revision = current
      }
    },
    impact: guarded((notice: CrateImpactNotice) => {
      if (!inbox.accept(notice.id, engine.state() === 'running')) return
      const seed = Number.parseInt(notice.id.split(':').pop() ?? '0', 10) % variants
      engine.play(crateCue(notice, seed), { position: notice })
    }),
    // Called each frame with the feet that landed in the visible gait; speed sets how firmly they land.
    footsteps: guarded((footfalls: number, player: Player, point: Point3, speed: number, own: boolean) => {
      const brush = engine.state() === 'running' ? foliage.step(player.id, point, speed, engine.now()) : null
      if (brush) engine.play(foliageCue(brush, ++brushes % variants), { position: { ...point, x: brush.x, z: brush.z }, gain: own ? localFootstepGain : 1 })
      // Every sound lands on a real footfall, but a brisk gait is thinned so steps do not rattle.
      const now = engine.now()
      if (footfalls <= 0 || engine.state() !== 'running' || now - (lastStep.get(player.id) ?? -Infinity) < footstepRecipe.playback.minimumIntervalSeconds) return
      const ground = footGround(point, player, rain)
      if (!ground) return
      lastStep.set(player.id, now)
      const count = (steps.get(player.id) ?? 0) + 1
      steps.set(player.id, count)
      const cue = footstepCue({ ...ground, strength: Math.min(1, speed / brisk) }, count % variants)
      engine.play(cue, { position: { x: point.x, y: point.y + footfallEmitterLiftMetres, z: point.z }, gain: own ? localFootstepGain : 1 })
    }),
    // Per frame: the listener follows the camera, rain raises the surf, and the truck's motion drives its engine.
    frame: guarded(({ listener, forward, weather, weatherAt, time, delta, state, truckAt }: AudioFrame) => {
      engine.setListener(listener, forward)
      rain = weather.rain
      surf.frame(listener, { strength: surfStrength(rain), spacing: 1 }, delta)
      wind.frame(listener, time, rain, delta)
      birds.frame(listener, time, weather, weatherAt)
      if (state && truckAt && delta > 0) {
        const speed = Math.abs(state.truck.speed)
        const acceleration = truckSpeed === undefined ? 0 : (speed - truckSpeed) / delta
        truckSpeed = speed
        truck.frame(engineInputs(state, acceleration), truckAt, delta)
      }
    }),
    setSound(settings: SoundSettings) {
      engine.setSettings(settings)
    },
    dispose() {
      target.removeEventListener('pointerdown', wake, true)
      target.removeEventListener('keydown', wake, true)
      target.document.removeEventListener('visibilitychange', visibility)
      surf.dispose()
      truck.dispose()
      wind.dispose()
      engine.dispose()
    },
  }
}
