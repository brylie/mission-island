import { seededRandom } from '../seeded-random.ts'
import type { Point } from '../world.ts'
import type { AudioEngine, AudioState, Lane } from './engine.ts'
import { swellCue, swellSeconds } from './recipes.ts'
import { createShoreFollower, surfVoices } from './shore.ts'

type SurfSettings = { strength: number; spacing: number }

// Average seconds between breakers on one voice before seeded variation.
const baseSpacing = 5.2
const lookahead = 0.6
const swellVariants = 3

type Voice = { lane: Lane; next: number; random: () => number; count: number }

// Schedules overlapping swells on each persistent surf voice in audio time.
export function createSurfPlayer(engine: AudioEngine, seed = 1) {
  const follower = createShoreFollower()
  let voices: Voice[] = []

  // After a resume, start every voice afresh rather than catching up on missed breakers.
  function restart() {
    const now = engine.now()
    voices.forEach((voice, i) => {
      voice.next = now + 0.15 + i * 0.9 + voice.random() * 0.8
      voice.lane.setGain(0, 0.01)
    })
  }
  const unwatch = engine.onState((state: AudioState) => {
    if (state === 'running') restart()
  })

  function ensureVoices() {
    if (voices.length) return true
    const lanes = Array.from({ length: surfVoices }, () => engine.lane('ambience', true))
    if (lanes.some((lane) => !lane)) return false
    voices = lanes.map((lane, i) => ({ lane: lane!, next: 0, random: seededRandom(seed * 31 + i * 7 + 1), count: 0 }))
    restart()
    return true
  }

  return {
    frame(listener: Point, settings: SurfSettings, delta: number) {
      if (engine.state() !== 'running' || !ensureVoices()) return
      const now = engine.now()
      const placed = follower.update(listener, delta)
      for (const [i, voice] of voices.entries()) {
        const { gain, ...position } = placed[i]
        voice.lane.setPosition(position)
        voice.lane.setGain(gain, 1.2)
        // Silent voices keep their rhythm, so walking back to the shore finds the same breakers.
        while (voice.next < now + lookahead) {
          const strength = Math.min(1, Math.max(0, settings.strength * (0.8 + voice.random() * 0.4)))
          if (gain > 0.005) {
            engine.play(swellCue({ strength }, voice.count++ % swellVariants + i * swellVariants), { bus: 'ambience', lane: voice.lane, at: voice.next })
          }
          const spacing = baseSpacing * settings.spacing * (0.75 + voice.random() * 0.5)
          voice.next = Math.max(voice.next + Math.min(spacing, swellSeconds(strength) * 1.4), now)
        }
      }
    },
    dispose() {
      unwatch()
      voices.forEach((voice) => voice.lane.dispose())
      voices = []
    },
  }
}
