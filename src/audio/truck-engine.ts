import { flatbedEngineDrive as drive } from '../assets/audio/flatbed-engine.ts'
import type { AudioEngine, Lane, Point3 } from './engine.ts'
import type { LoopVoice } from './loop-voice.ts'
import { motorCue, type MotorLayer } from './motor-recipes.ts'
import { engineEffort, engineTarget, type EngineInputs } from './truck-engine-model.ts'

const silentStopMultiplier = 2
const layers: MotorLayer[] = ['idle', 'load']

// The flatbed's engine, heard from the truck by everyone. Two loops glide in pitch and level as the
// truck idles, pulls away, cruises and slows; they fade out when the driver leaves.
export function createTruckEngine(engine: AudioEngine, seed = 1) {
  let lane: Lane | null = null
  const voices: Record<MotorLayer, LoopVoice | null> = { idle: null, load: null }
  let effort = 0
  let startedAt = -Infinity
  let quietFor = 0

  function ensure(layer: MotorLayer, roughness: number) {
    const current = voices[layer]
    if (current?.alive()) return current
    const started = lane ? engine.loop(motorCue({ layer, roughness }, seed), lane) : null
    if (started) {
      started.setRate(drive.startRate, 0)
      startedAt = engine.now()
    }
    voices[layer] = started
    return started
  }

  function silence() {
    for (const layer of layers) {
      voices[layer]?.stop(drive.stopSeconds)
      voices[layer] = null
    }
  }

  return {
    frame(inputs: EngineInputs, at: Point3, delta: number, roughness: number = drive.roughness) {
      if (engine.state() !== 'running') return
      lane ??= engine.lane('effects', true)
      if (!lane) return
      lane.setGain(1, drive.levelSeconds)
      lane.setPosition(at)
      if (!inputs.running) {
        quietFor += delta
        for (const layer of layers) {
          voices[layer]?.setLevel(0, drive.stopSeconds)
          voices[layer]?.setRate(drive.startRate, drive.stopSeconds)
        }
        if (quietFor > drive.stopSeconds * silentStopMultiplier) silence()
        effort = 0
        return
      }
      quietFor = 0
      effort += (engineEffort(inputs) - effort) * (1 - Math.exp(-delta / drive.effortSmoothingSeconds))
      const target = engineTarget(inputs, effort)
      const starting = engine.now() - startedAt < drive.startSeconds
      const glide = starting ? drive.startSeconds : inputs.braking ? drive.brakingRateSeconds : drive.rateSeconds
      const levels: Record<MotorLayer, number> = { idle: target.idleLevel, load: target.loadLevel }
      for (const layer of layers) {
        const voice = ensure(layer, roughness)
        voice?.setRate(target.rate, glide)
        voice?.setLevel(levels[layer], starting ? drive.startSeconds : drive.levelSeconds)
      }
    },
    effort: () => effort,
    dispose() {
      silence()
      lane?.dispose()
      lane = null
    },
  }
}
