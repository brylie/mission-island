import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coastPoint } from '../src/terrain.ts'
import {
  fullMapView,
  mapPointInView,
  maxMapZoom,
  panMap,
  pointInWorld,
  pointOnMap,
  shotCameraPoint,
  viewPointOnMap,
  zoomMap,
} from '../src/workbench/landscape-map-projection.ts'

test('the landscape map fits the coastline and maps pointer coordinates north-up', () => {
  for (let i = 0; i < 256; i++) {
    const point = coastPoint(i * Math.PI / 128)
    const { u, v } = pointOnMap(point)
    assert.ok(u > 0 && u < 1 && v > 0 && v < 1)
    const world = pointInWorld(u, v)
    assert.ok(Math.abs(world.x - point.x) < 1e-9)
    assert.ok(Math.abs(world.z - point.z) < 1e-9)
  }
  assert.ok(pointOnMap({ x: 0, z: 100 }).v < pointOnMap({ x: 0, z: 0 }).v)
  assert.ok(pointOnMap({ x: 20, z: 0 }).u > pointOnMap({ x: 0, z: 0 }).u)
})

test('saved shots use their orbit camera position on the map', () => {
  const camera = { alpha: 0, beta: Math.PI / 2, radius: 14, target: [-39.7, 4.05, 19.2] }
  const east = shotCameraPoint(camera)
  assert.ok(Math.abs(east.x - (camera.target[0] + 14)) < 1e-9)
  assert.equal(east.z, camera.target[2])
  const north = shotCameraPoint({ ...camera, alpha: Math.PI / 2, beta: Math.PI / 6 })
  assert.ok(Math.abs(north.x - camera.target[0]) < 1e-9)
  assert.ok(Math.abs(north.z - (camera.target[2] + 7)) < 1e-9)
})

test('zoom keeps the pointed-at terrain fixed and clamps panning to the island map', () => {
  const anchor = { u: 0.35, v: 0.7 }
  const zoomed = zoomMap(fullMapView, 4, anchor)
  const position = mapPointInView(anchor, zoomed)
  assert.ok(Math.abs(position.u - anchor.u) < 1e-9)
  assert.ok(Math.abs(position.v - anchor.v) < 1e-9)
  assert.deepEqual(panMap(zoomed, { u: 10, v: -10 }), { u: 0, v: 0.75, zoom: 4 })
  assert.equal(zoomMap(zoomed, 1000, anchor).zoom, maxMapZoom)
  assert.deepEqual(zoomMap(zoomed, 0.1, anchor), fullMapView)
})

test('a draft drag on a zoomed and panned view translates to world metres', () => {
  const view = { u: 0.3, v: 0.45, zoom: 8 }
  const object = pointInWorld(0.35, 0.5)
  const cursor = mapPointInView(pointOnMap(object), view)
  const moved = viewPointOnMap({ u: cursor.u + 0.08, v: cursor.v - 0.08 }, view)
  const world = pointInWorld(moved.u, moved.v)
  const expected = pointInWorld(0.36, 0.49)
  assert.ok(Math.abs(world.x - expected.x) < 1e-9)
  assert.ok(Math.abs(world.z - expected.z) < 1e-9)
})
