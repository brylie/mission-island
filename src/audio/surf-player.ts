import { seededRandom } from '../seeded-random.ts'
import type { Point } from '../world.ts'
import type { AudioEngine, AudioState, Lane } from './engine.ts'
import { swellCue, swellSeconds } from './recipes.ts'
import { createShoreFollower, surfVoices } from './shore.ts'

const resumeLeadSeconds = 0.15
const voiceStaggerSeconds = 0.9
const resumeJitterSeconds = 0.8
const restartMuteRampSeconds = 0.01
const voiceSeedStride = 31
const voiceSeedOffset = 7
const surfGainRampSeconds = 1.2
const minimumSwellGain = 0.8
const swellGainVariation = 0.4
const silenceThreshold = 0.005
const minimumIntervalRatio = 0.75
const intervalRatioVariation = 0.5
export const maximumSwellIntervalRatio = 1.4

type SurfSettings = { strength: number, spacing: number }

// Average seconds between breakers on one voice before seeded variation.
export const baseSwellSpacingSeconds = 5.2
const lookahead = 0.6
export const swellVariants = 3

export const swellSeed = (count: number, voice: number) => count % swellVariants + voice * swellVariants

type Voice = { lane: Lane, next: number, random: () => number, count: number }

// Schedules overlapping swells on each persistent surf voice in audio time.
export function createSurfPlayer(engine: AudioEngine, seed = 1) {
  const follower = createShoreFollower()
  let voices: Voice[] = []

  // After a resume, start every voice afresh rather than catching up on missed breakers.
  function restart() {
    const now = engine.now()
    voices.forEach((voice, i) => {
      voice.next = now + resumeLeadSeconds + i * voiceStaggerSeconds + voice.random() * resumeJitterSeconds
      voice.lane.setGain(0, restartMuteRampSeconds)
    })
  }
  const unwatch = engine.onState((state: AudioState) => {
    if (state === 'running') restart()
  })

  function ensureVoices() {
    if (voices.length) return true
    const lanes = Array.from({ length: surfVoices }, () => engine.lane('ambience', true))
    if (lanes.some((lane) => !lane)) return false
    voices = lanes.map((lane, i) => ({ lane: lane!, next: 0, random: seededRandom(seed * voiceSeedStride + i * voiceSeedOffset + 1), count: 0 }))
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
        voice.lane.setGain(gain, surfGainRampSeconds)
        // Silent voices keep their rhythm, so walking back to the shore finds the same breakers.
        while (voice.next < now + lookahead) {
          // The weather sets each breaker's shape; individual breakers vary only in loudness,
          // so the few cached variants cover the whole shore.
          const loudness = minimumSwellGain + voice.random() * swellGainVariation
          if (gain > silenceThreshold) {
            engine.play(swellCue({ strength: settings.strength }, swellSeed(voice.count++, i)), { bus: 'ambience', lane: voice.lane, at: voice.next, gain: loudness })
          }
          const spacing = baseSwellSpacingSeconds * settings.spacing * (minimumIntervalRatio + voice.random() * intervalRatioVariation)
          voice.next = Math.max(voice.next + Math.min(spacing, swellSeconds(settings.strength) * maximumSwellIntervalRatio), now)
        }
      }
    },
    dispose() {
      unwatch()
      voices.forEach((voice) => void voice.lane.dispose())
      voices = []
    },
  }
}
