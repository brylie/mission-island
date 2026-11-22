export interface ReferenceCrop { zoom: number, x: number, y: number }
const imageMidpoint = 0.5
const cropCoordinates = 3
const cropLinkDecimals = 5
const halves = 2
export const fitCrop: ReferenceCrop = { zoom: 1, x: imageMidpoint, y: imageMidpoint }
export const maxZoom = 8
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

// Store the focal point in image coordinates so a link works at other viewport sizes.
export function readCrop(raw?: string | null): ReferenceCrop {
  if (typeof raw !== 'string') return fitCrop
  const parts = raw.split(',')
  const [zoom, x, y] = parts.map(Number)
  if (parts.length !== cropCoordinates || parts.some((p) => !p.trim()) || ![zoom, x, y].every(Number.isFinite)
    || zoom <= 1 || zoom > maxZoom || x < 0 || x > 1 || y < 0 || y > 1) return fitCrop
  return { zoom, x, y }
}

export function encodeCrop(crop: ReferenceCrop) {
  return crop.zoom === 1 ? null : [crop.zoom, crop.x, crop.y].map((n) => Number(n.toFixed(cropLinkDecimals))).join(',')
}

interface PhotoSize { width: number, height: number, aspect: number }

export function photoFrame(size: PhotoSize, crop: ReferenceCrop) {
  const width = Math.min(size.width, size.height * size.aspect) * crop.zoom
  const height = width / size.aspect
  function edge(available: number, length: number, center: number) {
    return length <= available ? (available - length) / halves : clamp(available / halves - length * center, available - length, 0)
  }
  return { width, height, left: edge(size.width, width, crop.x), top: edge(size.height, height, crop.y) }
}

export interface PhotoPoint { x: number, y: number }

// Keep the pixel under the old pointer beneath the new pointer through both pan and zoom.
export function moveCrop(size: PhotoSize, crop: ReferenceCrop, requestedZoom: number, from: PhotoPoint, to: PhotoPoint): ReferenceCrop {
  const zoom = clamp(requestedZoom, 1, maxZoom)
  if (zoom === 1) return fitCrop
  const old = photoFrame(size, crop)
  const width = old.width * zoom / crop.zoom, height = old.height * zoom / crop.zoom
  const proposed = { zoom, x: (from.x - old.left) / old.width + (size.width / halves - to.x) / width, y: (from.y - old.top) / old.height + (size.height / halves - to.y) / height }
  const frame = photoFrame(size, proposed)
  return { zoom, x: (size.width / halves - frame.left) / width, y: (size.height / halves - frame.top) / height }
}
