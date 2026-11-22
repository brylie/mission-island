import { walkingHeight } from '../terrain.ts'
import type { Point } from '../world.ts'

export type InteractionPolicies = Readonly<Record<string, 'default' | 'explicit' | 'feature-recheck'>>

type Merged<Tables extends readonly object[]>
  = Tables extends readonly [infer First, ...infer Rest extends readonly object[]] ? First & Merged<Rest> : unknown

// Each feature owns its action names. A repeated name would silently replace another feature's policy or handler.
export function mergeDisjoint<const Tables extends readonly object[]>(...tables: Tables): Merged<Tables> {
  const merged: Record<string, unknown> = {}
  for (const table of tables) {
    for (const [action, entry] of Object.entries(table)) {
      if (Object.hasOwn(merged, action)) throw new Error(`Interaction action "${action}" is defined by more than one feature`)
      Object.defineProperty(merged, action, { value: entry, enumerable: true, writable: true, configurable: true })
    }
  }
  return merged as Merged<Tables>
}

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
