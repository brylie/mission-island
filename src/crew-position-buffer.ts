import type { Point } from './world.ts'

// Play the authoritative ground track a few ticks behind the host so every
// display frame can interpolate between known positions, including at a stop.
export function createCrewPositionBuffer() {
  const samples: (Point & { time: number })[] = []
  const delay = .1
  let cursor = 0
  function reset() { samples.length = 0 }
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
    const rate = Math.max(.55, Math.min(1.45, 1 + 3 * error))
    cursor = Math.min(newest.time, Math.max(newest.time - .4, cursor + delta * rate))
    while (samples.length > 1 && samples[1].time <= cursor) samples.shift()
    const [a, b] = samples
    if (!b || cursor <= a.time) return a
    const t = (cursor - a.time) / (b.time - a.time)
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
  }
  return { push, sample, reset }
}
