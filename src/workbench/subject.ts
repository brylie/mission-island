import type { MeshFactory } from '../island-meshes'
import type { SubjectGroup } from './library'
import type { FieldSite } from './field-site'
import type { LightingPreset } from './lighting'
import type { Point } from '../world'

type Value = string | number | boolean
export type Values = Record<string, Value>

export type Control = { key: string; label: string; rebuild?: boolean } & (
  | { type: 'select'; value: string; choices: Record<string, string> }
  | { type: 'range' | 'number'; value: number; min: number; max: number; step: number }
  | { type: 'checkbox'; value: boolean }
  | { type: 'color'; value: string }
)

interface Playback {
  time: number
  rate: number
  seek: boolean
  lighting: LightingPreset
  camera: Point & { y: number }
  delta: number
  light: number
  rain: number
}

export interface Entry {
  id: string
  name: string
  group: SubjectGroup
  fieldSite?: (values: Values) => FieldSite
  description: string
  swatch?: string
  source: string
  readout?: string
  duration?: number
  angle?: number
  headroom?: number
  topView?: boolean
  landscape?: boolean
  ground?: { color: string; height: number }
  actions?: { label: string; enabled(values: Values): boolean; run(values: Values): void }[]
  controls?: Control[]
  create(meshes: MeshFactory, values: Values, reportError: (error: string) => void, observe: (text: string) => void):
    ((frame: Playback, values: Values) => void) | void
}

export const control = (key: string, label: string, value: string, choices: Record<string, string>, rebuild = false): Control =>
  ({ type: 'select', key, label, value, choices, rebuild })
export const range = (key: string, label: string, value: number, min: number, max: number, step: number, rebuild = false): Control =>
  ({ type: 'range', key, label, value, min, max, step, rebuild })
