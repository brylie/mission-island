import type { Weather } from './protocol'

export const daySeconds = 480
export const dawnHour = 6
export const hoursPerHalfDay = 12

const duskHour = 18
export const hoursPerDay = 24
const nightLightFade = 3.6
const showerCycleDays = 3
const dryDayIndex = 2
const showerStartPhase = 0.43
const showerDailyOffset = 0.07
const showerDurationPhase = 0.15
const showerRamp = 55

export function isNight(hour: number) {
  return hour < dawnHour || hour >= duskHour
}

export function nextDawn(seconds: number) {
  return (Math.floor(seconds / daySeconds) + 1) * daySeconds
}

// How many dawns have passed between two island times.
export function dawnsBetween(from: number, to: number) {
  return Math.floor(to / daySeconds) - Math.floor(from / daySeconds)
}

export function weatherAt(seconds: number): Weather {
  const day = seconds / daySeconds + dawnHour / hoursPerDay
  const index = Math.floor(day)
  const phase = day - index
  const cycleDay = index % showerCycleDays
  const shower = cycleDay !== dryDayIndex
  const start = showerStartPhase + cycleDay * showerDailyOffset
  const rain = shower ? Math.max(0, Math.min(1, (phase - start) * showerRamp, (start + showerDurationPhase - phase) * showerRamp)) : 0
  return { hour: phase * hoursPerDay, rain }
}

export function solarAngle(hour: number) {
  return (hour - dawnHour) * Math.PI / hoursPerHalfDay
}

export function daylight(hour: number) {
  return Math.max(0, Math.sin(solarAngle(hour)))
}

export function nightLighting(hour: number) {
  return 1 - Math.min(1, daylight(hour) * nightLightFade)
}

const dryRainThreshold = 0.35
const drySampleSeconds = 5
const dryLookbackHours = 48

// Hours since the last rain heavier than a light drizzle, looking back at most two days.
export function dryHoursAt(seconds: number) {
  const secondsPerHour = daySeconds / hoursPerDay
  for (let back = 0; back <= dryLookbackHours * secondsPerHour; back += drySampleSeconds) {
    if (weatherAt(Math.max(0, seconds - back)).rain > dryRainThreshold) return back / secondsPerHour
    if (seconds - back <= 0) return back / secondsPerHour
  }
  return dryLookbackHours
}
