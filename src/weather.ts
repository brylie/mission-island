import type { Weather } from './protocol'

export const daySeconds = 480

export function isNight(hour: number) {
  return hour < 6 || hour >= 18
}

export function nextDawn(seconds: number) {
  return (Math.floor(seconds / daySeconds) + 1) * daySeconds
}

// How many dawns have passed between two island times.
export function dawnsBetween(from: number, to: number) {
  return Math.floor(to / daySeconds) - Math.floor(from / daySeconds)
}

export function weatherAt(seconds: number): Weather {
  const day = seconds / daySeconds + 6 / 24
  const index = Math.floor(day)
  const phase = day - index
  const shower = index % 3 !== 2
  const start = 0.43 + (index % 3) * 0.07
  const rain = shower ? Math.max(0, Math.min(1, (phase - start) * 55, (start + 0.15 - phase) * 55)) : 0
  return { hour: phase * 24, rain }
}

export function daylight(hour: number) {
  return Math.max(0, Math.sin((hour - 6) * Math.PI / 12))
}

export function nightLighting(hour: number) {
  return 1 - Math.min(1, daylight(hour) * 3.6)
}
