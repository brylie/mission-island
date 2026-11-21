import type { Player, ServerMessage, Snapshot } from '../protocol.ts'
import { createAudioEngine, type Point3 } from './engine.ts'
import { createImpactInbox } from './impact-inbox.ts'
import type { SoundSettings } from './mix.ts'
import { crateCue, footstepCue, swellCue, type Rendered } from './recipes.ts'
import { footSurface } from './surface.ts'
import { createSurfPlayer, swellSeed, swellVariants } from './surf-player.ts'
import { surfVoices } from './shore.ts'

export type CrateImpactNotice = Extract<ServerMessage, { type: 'crate-impact' }>

const variants = 4
// Walking pace in metres per second, where footsteps reach full strength.
const brisk = 12
// One level inside each strength tier, used to render every variant ahead of need.
const tierLevels = [0.15, 0.5, 0.85]

const surfStrength = (rain: number) => 0.42 + Math.min(1, Math.max(0, rain)) * 0.4

// Every footstep, crate and current surf variant, rendered in the background once audio starts,
// so no cue in play waits on a buffer.
function islandVariants(rain: number) {
  const cues: Rendered[] = []
  for (let voice = 0; voice < surfVoices; voice++) {
    for (let count = 0; count < swellVariants; count++) cues.push(swellCue({ strength: surfStrength(rain) }, swellSeed(count, voice)))
  }
  for (const strength of tierLevels) {
    for (let seed = 0; seed < variants; seed++) {
      for (const surface of ['gravel', 'sand', 'boards', 'fallback'] as const) cues.push(footstepCue({ surface, strength }, seed))
      for (const surface of ['ground', 'bed'] as const) cues.push(crateCue({ strength, surface }, seed))
    }
  }
  return cues
}

// Starter Island's client mix: owns the audio context, its gesture and visibility lifecycle,
// and turns host notices and local world state into cues.
export function createIslandAudio(target: Window = window) {
  const engine = createAudioEngine()
  const inbox = createImpactInbox(() => performance.now())
  let revision: number | undefined
  const steps = new Map<number, number>()
  const surf = createSurfPlayer(engine)
  let rain = 0
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
    impact(notice: CrateImpactNotice) {
      if (!inbox.accept(notice.id, engine.state() === 'running')) return
      const seed = Number.parseInt(notice.id.split(':').pop() ?? '0', 10) % variants
      engine.play(crateCue(notice, seed), { position: notice })
    },
    // Called each frame with the feet that landed in the visible gait; speed sets how firmly they land.
    footsteps(footfalls: number, player: Player, point: Point3, speed: number, own: boolean) {
      const surface = footfalls > 0 ? footSurface(point, player) : null
      if (!surface || engine.state() !== 'running') return
      const count = (steps.get(player.id) ?? 0) + 1
      steps.set(player.id, count)
      const cue = footstepCue({ surface, strength: Math.min(1, speed / brisk) }, count % variants)
      engine.play(cue, { position: { x: point.x, y: point.y + 0.1, z: point.z }, gain: own ? 0.7 : 1 })
    },
    // Per frame: the listener follows the camera, and rain raises the surf.
    frame(position: Point3, forward: Point3, weatherRain: number, delta: number) {
      engine.setListener(position, forward)
      rain = weatherRain
      surf.frame(position, { strength: surfStrength(rain), spacing: 1 }, delta)
    },
    setSound(settings: SoundSettings) {
      engine.setSettings(settings)
    },
    dispose() {
      target.removeEventListener('pointerdown', wake, true)
      target.removeEventListener('keydown', wake, true)
      target.document.removeEventListener('visibilitychange', visibility)
      surf.dispose()
      engine.dispose()
    },
  }
}
