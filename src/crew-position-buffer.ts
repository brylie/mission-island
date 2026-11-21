import { smoothRange } from './simulation/motion-easing.ts'
import type { Point } from './world.ts'

// Play the authoritative ground track a few ticks behind the host so every
// display frame can interpolate between known positions, including at a stop.
// When updates arrive late the walker coasts a short way at its last pace
// and slows, so a late update does not halt it mid-stride.
export function createCrewPositionBuffer() {
  const samples: (Point & { time: number })[] = []
  const delay = .1, coast = .24
  let cursor = 0, pace = 1
  function reset() { samples.length = 0; pace = 1 }
  function push(point: Point, time: number) {
    const last = samples.at(-1)
    if (last && time === last.time) return
    if (last && (time < last.time || time - last.time > .4 || Math.hypot(point.x - last.x, point.z - last.z) > 2)) reset()
    if (!samples.length) cursor = time - delay
    samples.push({ time, x: point.x, z: point.z })
    while (samples.length > 2 && samples[1].time < time - .4) samples.shift()
  }
  function sample(delta: number): Point | undefined {
    const newest = samples.at(-1)
    if (!newest) return
    const error = newest.time - cursor - delay
    // A busy host advances its clock slower than ours. Learn its pace, and
    // regain the playback delay gradually: a hard correction shows as a
    // change of walking speed.
    pace = Math.max(.4, Math.min(1.1, pace + 2 * error * delta))
    const rate = Math.max(.4, Math.min(1.25, pace + 1.5 * error))
    // Past the newest position, ease off until the next update arrives.
    const ahead = 1 - smoothRange(coast / 3, coast, cursor - newest.time)
    cursor = Math.max(newest.time - .4, cursor + delta * rate * ahead)
    // Keep the last pair of positions as the pace to coast at.
    while (samples.length > 2 && samples[1].time <= cursor) samples.shift()
    const [a, b] = samples
    if (!b || cursor <= a.time) return a
    const t = (cursor - a.time) / (b.time - a.time)
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
  }
  return { push, sample, reset }
}
