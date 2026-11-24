import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groundSurface } from '../src/audio/surface.ts'
import { roadNetwork } from '../src/assets/geometry/road-kinds.ts'
import { gradedRoads } from '../src/terrain.ts'

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

test('past a road\'s free end the ground stops sounding like a road', () => {
  const pineDraw = gradedRoads().find((road) => road.id === 'pine-draw-road')
  const end = pineDraw.profile.at(-1)
  const beyond = { x: end.x + end.dx * 6, z: end.z + end.dz * 6 }
  assert.notEqual(groundSurface(beyond), 'gravel')
})
