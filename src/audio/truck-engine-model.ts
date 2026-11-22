import { flatbedEngineDrive as drive } from '../assets/audio/flatbed-engine.ts'
import type { Snapshot } from '../protocol.ts'
import { clamp01 } from './recipe-kit.ts'

export type EngineInputs = {
  running: boolean
  speed: number
  acceleration: number
  braking: boolean
  pitch: number
  crates: number
}

type EngineTarget = { effort: number, rate: number, idleLevel: number, loadLevel: number }

// What the client can see of the engine: a driver in the seat keeps it running, and the bed shows the load.
export function engineInputs(state: Snapshot, acceleration: number): EngineInputs {
  const { speed, braking, pitch } = state.truck
  return {
    running: state.players.some((player) => player.connected && player.seat === 'driver'),
    speed,
    acceleration,
    braking,
    pitch,
    crates: state.items.filter((item) => item.kind === 'crate' && item.onBed && !item.delivered).length,
  }
}

// Effort is how hard the engine works: pulling away, climbing and hauling, but never while braking.
// Nose-up pitch is negative, so climbing is the pitch against the direction of travel.
export function engineEffort({ running, speed, acceleration, braking, pitch, crates }: EngineInputs) {
  if (!running || braking) return 0
  const climb = Math.max(0, -pitch * Math.sign(speed))
  const pulling = Math.max(0, acceleration) / drive.accelerationForFullEffort
  const hauling = Math.min(crates, drive.cratesForFullEffort) / drive.cratesForFullEffort * drive.crateEffort
  return clamp01(pulling + climb / drive.climbForFullEffort + (pulling || climb ? hauling : 0))
}

// Pitch follows road speed with a lift for effort; the working layer rises with effort, the idle steps back.
export function engineTarget(inputs: EngineInputs, effort: number): EngineTarget {
  if (!inputs.running) return { effort: 0, rate: drive.startRate, idleLevel: 0, loadLevel: 0 }
  const pace = clamp01(Math.abs(inputs.speed) / drive.topSpeedMetresPerSecond)
  return {
    effort,
    rate: drive.idleRate + pace * (drive.topRate - drive.idleRate) + effort * drive.effortRate,
    idleLevel: drive.level * (1 - drive.idleWhenWorking * Math.max(effort, pace)),
    loadLevel: drive.level * Math.min(1, effort + pace * drive.loadAtTopSpeed),
  }
}
