import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'

// The road designer's map keys: arrows pan the map a step, and + and − zoom it.
export const panKeys: Readonly<Record<string, { u: number, v: number }>> = {
  ArrowLeft: { u: 1, v: 0 },
  ArrowRight: { u: -1, v: 0 },
  ArrowUp: { u: 0, v: 1 },
  ArrowDown: { u: 0, v: -1 },
}
// Matched by key, and by physical key so + works without Shift on any layout.
const zoomInKeys = new Set(['+', '=', 'Equal', 'NumpadAdd']), zoomOutKeys = new Set(['-', '_', 'Minus', 'NumpadSubtract'])
export const zoomKey = (event: KeyboardEvent) => zoomInKeys.has(event.key) || zoomInKeys.has(event.code) ? look.zoomStep : zoomOutKeys.has(event.key) || zoomOutKeys.has(event.code) ? 1 / look.zoomStep : undefined
