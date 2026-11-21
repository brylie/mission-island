import { fraction, smooth } from '../surface-pattern-tools.ts'

export const half = 0.5
export const fullTurn = Math.PI + Math.PI
const rimSoftnessRatio = 0.7

export function centered(phase: number) {
  return fraction(phase + half) - half
}

export function disk(distance: number, radius: number, edge: number) {
  return 1 - smooth(radius - edge, radius, distance)
}

export function rim(distance: number, radius: number, width: number) {
  return disk(Math.abs(distance - radius), width, width * rimSoftnessRatio)
}
