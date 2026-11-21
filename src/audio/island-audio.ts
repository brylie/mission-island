import type { Player, ServerMessage, Snapshot } from '../protocol.ts'
import { createAudioEngine, type Point3 } from './engine.ts'
import { createImpactInbox } from './impact-inbox.ts'
import type { SoundSettings } from './mix.ts'
import { crateCue, footstepCue } from './recipes.ts'
import { footSurface } from './surface.ts'
import { createSurfPlayer } from './surf-player.ts'

export type CrateImpactNotice = Extract<ServerMessage, { type: 'crate-impact' }>

const variants = 4
// Walking pace in metres per second, where footsteps reach full strength.
const brisk = 12

// Starter Island's client mix: owns the audio context, its gesture and visibility lifecycle,
// and turns host notices and local world state into cues.
export function createIslandAudio(target: Window = window) {
  const engine = createAudioEngine()
  const inbox = createImpactInbox(() => performance.now())
  let revision: number | undefined
  const steps = new Map<number, number>()
  const surf = createSurfPlayer(engine)

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
      const seed = notice.item * variants + Number.parseInt(notice.id.split(':').pop() ?? '0', 10) % variants
      engine.play(crateCue(notice, seed), { position: notice })
    },
    // Called each frame with the feet that landed in the visible gait; speed sets how firmly they land.
    footsteps(footfalls: number, player: Player, point: Point3, speed: number, own: boolean) {
      const surface = footfalls > 0 ? footSurface(point, player) : null
      if (!surface || engine.state() !== 'running') return
      const count = (steps.get(player.id) ?? 0) + 1
      steps.set(player.id, count)
      const cue = footstepCue({ surface, strength: Math.min(1, speed / brisk) }, player.id * variants + count % variants)
      engine.play(cue, { position: { x: point.x, y: point.y + 0.1, z: point.z }, gain: own ? 0.7 : 1 })
    },
    // Per frame: the listener follows the camera, and rain raises the surf.
    frame(position: Point3, forward: Point3, rain: number, delta: number) {
      engine.setListener(position, forward)
      surf.frame(position, { strength: 0.42 + Math.min(1, Math.max(0, rain)) * 0.4, spacing: 1 }, delta)
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
