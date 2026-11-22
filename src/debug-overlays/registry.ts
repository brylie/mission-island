import type { Point } from '../world.ts'
import type { Snapshot } from '../protocol.ts'

// Debug overlays draw flat primitives over the island. A layer is data plus a sampler:
// it reads the world (and the live snapshot when there is one) and returns primitives,
// which one shared renderer draws in the game and the Workbench.

export interface OverlayLine { kind: 'line', points: readonly Point[], color: string, closed?: boolean, lift?: number, height?: number }
export interface OverlayCell { kind: 'cell', x: number, z: number, size: number, color: string }
export interface OverlayRing { kind: 'ring', x: number, z: number, radius: number, color: string, lift?: number }
export type OverlayPrimitive = OverlayLine | OverlayCell | OverlayRing

// A Workbench study has no host, so live layers get the island clock and weather without a snapshot.
export interface OverlayContext {
  islandTime: number
  state?: Readonly<Pick<Snapshot, 'events' | 'juniper' | 'islandTime'>>
}

export interface OverlayLayer {
  id: string
  label: string
  description: string
  // Static layers are sampled once; live layers every frame they are shown.
  live: boolean
  create(): (context: OverlayContext) => OverlayPrimitive[]
}

interface ScalarField {
  id: string
  label: string
  description: string
  // World bounds and grid spacing in metres.
  bounds: { west: number, east: number, south: number, north: number }
  cellM: number
  // Value at a point, or undefined off the field (sea, outside the habitat).
  sample(point: Point): number | undefined
  // Ascending stops of value and colour.
  ramp: readonly (readonly [number, string])[]
}

function rampColor(ramp: ScalarField['ramp'], value: number) {
  let color = ramp[0][1]
  for (const [stop, stopColor] of ramp) if (value >= stop) color = stopColor
  return color
}

// Turns any scalar sampler into a static cell layer. Baked terrain fields such as moisture,
// flow accumulation or exposure plug in by passing their sampler and ramp here.
export function fieldLayer(field: ScalarField): OverlayLayer {
  return {
    id: field.id,
    label: field.label,
    description: field.description,
    live: false,
    create: () => () => {
      const cells: OverlayPrimitive[] = []
      const { west, east, south, north } = field.bounds
      for (let x = west; x <= east; x += field.cellM) {
        for (let z = south; z <= north; z += field.cellM) {
          const value = field.sample({ x, z })
          if (value !== undefined) cells.push({ kind: 'cell', x, z, size: field.cellM, color: rampColor(field.ramp, value) })
        }
      }
      return cells
    },
  }
}

export function createOverlayRegistry(layers: readonly OverlayLayer[]) {
  const byId = new Map(layers.map((layer) => [layer.id, layer]))
  if (byId.size !== layers.length) throw new Error('Debug overlay IDs must be unique')
  return {
    layers,
    get: (id: string) => byId.get(id),
    // Reads a comma-separated list such as `slope,wildfire`. Unknown IDs are reported, not ignored.
    read(text: string | null | undefined) {
      const ids = (text ?? '').split(',').map((id) => id.trim()).filter(Boolean)
      const unknown = ids.filter((id) => !byId.has(id))
      return { ids: [...new Set(ids.filter((id) => byId.has(id)))], unknown }
    },
  }
}

const hexRadix = 16
const channelMax = 255
const channelDigits = 2
const redStart = 1, greenStart = 3, blueStart = 5

// Linear blend between two #rrggbb colours, for heat ramps.
export function mixHex(from: string, to: string, share: number) {
  const t = Math.max(0, Math.min(1, share))
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + channelDigits), hexRadix)
  return '#' + [redStart, greenStart, blueStart].map((start) => Math.round(channel(from, start) + (channel(to, start) - channel(from, start)) * t))
    .map((value) => Math.min(channelMax, value).toString(hexRadix).padStart(channelDigits, '0')).join('')
}
