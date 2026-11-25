import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groundSurface } from '../src/audio/surface.ts'
import { roadKinds, roadNetwork } from '../src/assets/geometry/road-kinds.ts'
import { gradedRoads, roadSurfaceAt, roadSurfaceSource } from '../src/terrain.ts'

const across = (sample, metres) => ({ x: sample.x - sample.dz * metres, z: sample.z + sample.dx * metres })

test('a fire road crunches like gravel on its carriageway and sounds like bare ground on its verge', () => {
  const roads = gradedRoads()
  // Away from each end and from junctions: no other road's centreline within its formation and mouth.
  const reach = (other) => other.halfFormation + roadNetwork.filletM + roadNetwork.mouthBlendM
  const clearOfOthers = (road, point) => roads.every((other) => other === road || other.profile.every((q) => Math.hypot(q.x - point.x, q.z - point.z) > reach(other)))
  for (const road of roads) {
    for (const sample of road.profile.filter((s, i) => i > 30 && i < road.profile.length - 30 && i % 25 === 0 && clearOfOthers(road, s))) {
      assert.equal(groundSurface(sample), 'gravel', `${road.name} centre at ${sample.along} m`)
      assert.equal(groundSurface(across(sample, road.halfWidth - 0.3)), 'gravel', `${road.name} just inside the edge`)
      const verge = (road.halfWidth + road.halfFormation) / 2
      assert.equal(groundSurface(across(sample, verge)), 'fallback', `${road.name} verge at ${sample.along} m`)
      assert.notEqual(groundSurface(across(sample, road.halfFormation + 1)), 'gravel', `${road.name} past the shoulder`)
    }
  }
})

test('the trailhead sounds like pavement where the fire road\'s apron meets the harbor road', () => {
  const fireRoad = gradedRoads().find((road) => road.id === 'fire-road')
  const apron = fireRoad.profile[2]
  assert.equal(groundSurface(apron), 'pavement')
})

test('the trailhead apron is asphalt out to its shoulders, and the harbor road\'s own shoulder is no road verge', () => {
  const fireRoad = gradedRoads().find((road) => road.id === 'fire-road')
  const apron = fireRoad.profile[1]
  assert.equal(groundSurface(across(apron, -(fireRoad.halfWidth + fireRoad.halfFormation) / 2)), 'pavement', 'the apron\'s shoulder')
  // Near the junction the harbor road's shoulder sounds as it does elsewhere, not as a road verge.
  const harbor = roadSurfaceSource.network().roads.find((road) => road.id === 'harbor-road')
  const shoulder = roadKinds.paved.width / 2 + roadKinds.paved.shoulderWidth / 2
  const start = fireRoad.profile[0]
  for (const sample of harbor.samples.filter((s) => Math.hypot(s.x - start.x, s.z - start.z) < 25)) {
    for (const side of [shoulder, -shoulder]) {
      const point = across(sample, side)
      assert.notEqual(roadSurfaceAt(point), 'verge', `harbor road shoulder at (${point.x.toFixed(1)}, ${point.z.toFixed(1)})`)
    }
  }
})

test('a junction mouth crunches like the roads either side of it', () => {
  const spur = gradedRoads().find((road) => road.id === 'summit-spur')
  for (const sample of spur.profile.slice(0, 4)) assert.equal(groundSurface(sample), 'gravel', `spur mouth at ${sample.along} m`)
})

test('past a road\'s free end the ground stops sounding like a road', () => {
  const pineDraw = gradedRoads().find((road) => road.id === 'pine-draw-road')
  const end = pineDraw.profile.at(-1)
  const beyond = { x: end.x + end.dx * 6, z: end.z + end.dz * 6 }
  assert.notEqual(groundSurface(beyond), 'gravel')
})
