import type { Point } from '../world'
import { paintLandscapeMap, paintMapTracking } from './landscape-map-art'
import { landscapeMapSize, mapPointInView, pointOnMap, type MapView } from './landscape-map-projection'

const canvasWidth = 640
const atlasScale = 2

export function createLandscapeMapCanvas(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement) {
  canvas.width = overlay.width = canvasWidth
  canvas.height = overlay.height = Math.round(canvas.width * landscapeMapSize.height / landscapeMapSize.width)
  const base = canvas.getContext('2d')
  const ink = overlay.getContext('2d')
  let atlas: HTMLCanvasElement | undefined
  let lastOverlay = ''

  return {
    ready: Boolean(ink && base),
    hasOverlay: Boolean(ink),
    paintView(view: MapView) {
      if (!base) return false
      if (!atlas) {
        atlas = document.createElement('canvas')
        atlas.width = canvas.width * atlasScale
        atlas.height = canvas.height * atlasScale
        const art = atlas.getContext('2d')
        if (art) paintLandscapeMap(art)
      }
      base.drawImage(atlas, atlas.width * view.u, atlas.height * view.v, atlas.width / view.zoom, atlas.height / view.zoom, 0, 0, canvas.width, canvas.height)
      return true
    },
    track(view: MapView, viewChanged: boolean, focus: Point | undefined, cursor: Point, cursorVisible: boolean) {
      if (!ink) return
      const key = [focus?.x, focus?.z, cursorVisible, cursor.x, cursor.z].join(',')
      if (!viewChanged && key === lastOverlay) return
      const project = (point: Point) => mapPointInView(pointOnMap(point), view)
      paintMapTracking(ink, view.zoom, focus && project(focus), cursorVisible ? project(cursor) : undefined)
      lastOverlay = key
    },
  }
}
