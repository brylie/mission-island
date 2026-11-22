const pixelsPerWheelLine = 16
const wheelLines = 1
const wheelPages = 2

export function wheelDeltaUnits(mode: number, viewportHeight: number) {
  return mode === wheelLines ? pixelsPerWheelLine : mode === wheelPages ? viewportHeight : 1
}
