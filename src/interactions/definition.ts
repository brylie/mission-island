import { walkingHeight } from '../terrain.ts'
import type { Point } from '../world.ts'

export type InteractionPolicies = Readonly<Record<string, 'default' | 'explicit' | 'feature-recheck'>>

export interface InteractionChoice<Action extends string> {
  action: Action
  subject?: number
}

// The prompt and reticle describe the same interaction that the host can accept.
export interface InteractionOption<Action extends string> extends InteractionChoice<Action> {
  key: string
  label: string
  name: string
  at?: Point & { y: number }
  radius?: number
}

export function aimedAt(point: Point, height: number) {
  return { x: point.x, y: walkingHeight(point) + height, z: point.z }
}
