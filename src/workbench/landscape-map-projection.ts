import { coastBounds } from '../terrain.ts'
import type { Point } from '../world.ts'
import type { CameraState } from './stage'

const margin = 12
const coast = coastBounds()
const west = coast.west - margin
const east = coast.east + margin
const south = coast.south - margin
const north = coast.north + margin

export const landscapeMapSize = { width: east - west, height: north - south }

export interface MapPoint {
  u: number
  v: number
}

export interface MapView extends MapPoint {
  zoom: number
}

export const fullMapView: MapView = { u: 0, v: 0, zoom: 1 }
export const maxMapZoom = 16

export function clampMapPoint({ u, v }: MapPoint, limit = 1): MapPoint {
  return { u: Math.min(limit, Math.max(0, u)), v: Math.min(limit, Math.max(0, v)) }
}

export function mapPointInView(point: MapPoint, view: MapView): MapPoint {
  return { u: (point.u - view.u) * view.zoom, v: (point.v - view.v) * view.zoom }
}

export function viewPointOnMap(point: MapPoint, view: MapView): MapPoint {
  return { u: view.u + point.u / view.zoom, v: view.v + point.v / view.zoom }
}

export function panMap(view: MapView, delta: MapPoint): MapView {
  return { ...clampMapPoint({
    u: view.u - delta.u / view.zoom,
    v: view.v - delta.v / view.zoom,
  }, 1 - 1 / view.zoom), zoom: view.zoom }
}

export function zoomMap(view: MapView, requestedZoom: number, anchor: MapPoint): MapView {
  const zoom = Math.min(maxMapZoom, Math.max(1, requestedZoom))
  if (zoom === view.zoom) return view
  const point = viewPointOnMap(anchor, view)
  return { ...clampMapPoint({ u: point.u - anchor.u / zoom, v: point.v - anchor.v / zoom }, 1 - 1 / zoom), zoom }
}

export function pointOnMap({ x, z }: Point) {
  return { u: (x - west) / landscapeMapSize.width, v: (north - z) / landscapeMapSize.height }
}

export function pointInWorld(u: number, v: number): Point {
  return { x: west + u * landscapeMapSize.width, z: north - v * landscapeMapSize.height }
}

export function shotCameraPoint({ alpha, beta, radius, target }: CameraState): Point {
  const horizontalRadius = radius * Math.sin(beta)
  return {
    x: target[0] + Math.cos(alpha) * horizontalRadius,
    z: target[2] + Math.sin(alpha) * horizontalRadius,
  }
}
