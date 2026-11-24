import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds } from '../src/assets/geometry/road-kinds.ts'
import { createRoadGrading } from '../src/road-grading.ts'
import { naturalGroundHeight } from '../src/terrain.ts'
import { analyseRoad } from '../src/workbench/road-analysis.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'

// Ground that rises across the road (a side slope) and along it (a hill too steep to follow).
const natural = ({ x, z }) => z * 0.25 + Math.max(0, Math.min(20, (x - 60) * 0.4))
const layout = { id: 'test', name: 'Test road', kind: 'fire-road', points: [{ x: 0, z: 0 }, { x: 160, z: 0 }], bends: [0] }
const kind = roadKinds['fire-road']
const onRoadM = 0.08
const farM = 40
const stepM = 0.5
// Nothing in the graded ground stands steeper than the natural ground or a rock cut, with slack.
const steepestBank = 1 / kind.rockCutSlope
const wallSlack = 0.5
const grade = (natural, roads, paved = []) => {
  const grading = createRoadGrading(roads, natural, paved)
  return { grading, ground: (point) => natural(point) + grading.delta(point) }
}

// Every step of half a metre across and along each road's corridor, out past its banks.
function walls(grading, natural, ground, reachM = 24) {
  const found = []
  for (const road of grading.roads()) {
    for (const s of road.profile.filter((_, i) => i % 2 === 0)) {
      for (let t = -reachM; t <= reachM; t += stepM) {
        const p = { x: s.x - s.dz * t, z: s.z + s.dx * t }
        for (const q of [{ x: p.x - s.dz * stepM, z: p.z + s.dx * stepM }, { x: p.x + s.dx * stepM, z: p.z + s.dz * stepM }]) {
          const rise = Math.abs(ground(q) - ground(p)) / stepM, naturalRise = Math.abs(natural(q) - natural(p)) / stepM
          if (rise > Math.max(naturalRise, steepestBank) + wallSlack) found.push(`${road.name} ${rise.toFixed(1)}:1 at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`)
        }
      }
    }
  }
  return found
}

test('graded ground follows the road profile and eases back to the natural ground on its banks', () => {
  const { grading, ground } = grade(natural, [layout])
  const [road] = grading.roads()
  for (const sample of road.profile.filter((_, i) => i % 10 === 5)) {
    assert.ok(Math.abs(ground(sample) - sample.y) < onRoadM, `centre at ${sample.along.toFixed(0)} m is ${ground(sample).toFixed(2)}, profile ${sample.y.toFixed(2)}`)
    // Across the formation the road is level apart from its crown.
    for (const side of [road.halfWidth, -road.halfWidth]) assert.ok(Math.abs(ground({ x: sample.x, z: sample.z + side }) - (sample.y - kind.crown)) < onRoadM)
    assert.equal(grading.delta({ x: sample.x, z: sample.z + farM }), 0, 'far from the road the ground is untouched')
    assert.equal(grading.delta({ x: sample.x, z: sample.z - farM }), 0)
  }
  assert.deepEqual(walls(grading, natural, ground), [])
  assert.ok(grading.clearance(road.profile[40]) < 0, 'the centreline is inside the formation')
  assert.equal(grading.clearance({ x: 80, z: 200 }), Infinity)
})

test('on a hillside too steep for a fill, the road is benched into it and its banks still meet the ground', () => {
  // A 45 degree side slope: an embankment at 1.5 : 1 would never reach the ground below.
  const steep = ({ z }) => z
  const { grading, ground } = grade(steep, [layout])
  const [road] = grading.roads()
  for (const sample of road.profile.filter((_, i) => i % 10 === 5)) {
    // Below the downhill formation edge nothing is filled.
    for (let t = road.halfFormation; t < road.halfFormation + 10; t += 1) assert.ok(grading.delta({ x: sample.x, z: sample.z - t }) < onRoadM, `fill ${grading.delta({ x: sample.x, z: sample.z - t }).toFixed(2)} m below the road`)
  }
  assert.ok(road.banks.every((bank) => bank.left.meets && bank.right.meets), 'every bank meets the hillside')
  assert.deepEqual(walls(grading, steep, ground), [])
})

test('between the legs of a switchback the ground is continuous', () => {
  // Two legs 14 m apart up a 30 % slope, joined by a hairpin.
  const slope = ({ z }) => z * 0.3
  const hairpin = { id: 'switchback', name: 'Switchback', kind: 'fire-road', points: [{ x: 0, z: 0 }, { x: 80, z: 8 }, { x: 80, z: 22 }, { x: 0, z: 30 }], bends: [0, 0, 0], maxGrade: [0.2, 0.2, 0.2] }
  const { grading, ground } = grade(slope, [hairpin])
  assert.deepEqual(walls(grading, slope, ground), [])
})

test('a branch leaves its road through a smooth mouth and leaves that road as it was', () => {
  // The branch leaves the trunk where the trunk runs in cut through the hill, and climbs a gentle
  // side slope it can hold within its grade.
  const gentle = ({ x, z }) => z * 0.05 + Math.max(0, Math.min(20, (x - 60) * 0.4))
  const branch = { id: 'branch', name: 'Branch', kind: 'fire-road', points: [{ x: 100, z: 0 }, { x: 100, z: 60 }], bends: [0] }
  const { grading, ground } = grade(gentle, [layout, branch])
  const { grading: trunkOnly } = grade(gentle, [layout])
  assert.deepEqual(grading.network().junctions.map(({ branch: b, host, end }) => [b, host, end]), [[1, 0, 'start']])
  const [trunk, climb] = grading.roads()
  const atJunction = trunk.profile.find((sample) => sample.x >= 100)
  assert.ok(atJunction.cut > 1, 'the junction is in cut, where a second cut would show')
  // The trunk's carriageway is untouched by the branch.
  for (const sample of trunk.profile) {
    for (const t of [-trunk.halfWidth, 0, trunk.halfWidth]) {
      const point = { x: sample.x, z: sample.z + t }
      assert.ok(Math.abs(grading.delta(point) - trunkOnly.delta(point)) < 0.02, `trunk moved at ${sample.along} m`)
    }
  }
  // Past the mouth the ground is the branch's own profile.
  const mouth = trunk.halfFormation + 8 + 1
  for (const sample of climb.profile.filter((s) => s.z > mouth)) assert.ok(Math.abs(ground(sample) - sample.y) < onRoadM, `${ground(sample).toFixed(2)} on the branch at ${sample.along} m, profile ${sample.y.toFixed(2)}`)
  assert.deepEqual(walls(grading, gentle, ground), [])
})

test('the shipped roads keep to their grades and bends, never stand in a wall, and leave the roads they join as they were', () => {
  assert.ok(starterRoads.length >= 1, 'the island has its fire road')
  const shipped = createRoadGrading(starterRoads, naturalGroundHeight)
  const ground = (point) => naturalGroundHeight(point) + shipped.delta(point)
  for (const road of shipped.roads()) assert.deepEqual(analyseRoad(road).warnings.map((warning) => warning.text), [], road.name)
  assert.deepEqual(walls(shipped, naturalGroundHeight, ground).slice(0, 5), [])
  // A branch leaves the road it joins as that road alone would be.
  for (const { host, branch } of shipped.network().junctions) {
    const roads = shipped.network().roads
    const hostRoad = roads[host]
    if (!hostRoad.layout || !roads[branch].layout) continue
    // The same network without the branch.
    const alone = createRoadGrading(starterRoads.filter((layout) => layout.id !== roads[branch].id), naturalGroundHeight)
    const graded = shipped.roads().find((road) => road.id === hostRoad.id)
    for (const sample of graded.profile) {
      for (const t of [-graded.halfWidth, 0, graded.halfWidth]) {
        const point = { x: sample.x - sample.dz * t, z: sample.z + sample.dx * t }
        assert.ok(Math.abs(shipped.delta(point) - alone.delta(point)) < 0.02, `${roads[branch].name} moves ${hostRoad.name} at ${sample.along} m`)
      }
    }
  }
})

test('a road ending on a sharp peak keeps its grade to the end, rather than jumping to the summit', () => {
  // A free end takes the road's own graded height, not the ground at the end dot.
  const peak = ({ x, z }) => Math.max(0, 40 - Math.hypot(x - 100, z) * 2)
  const { grading } = grade(peak, [{ id: 'peak', name: 'Peak', kind: 'fire-road', points: [{ x: 0, z: 0 }, { x: 100, z: 0 }], bends: [0] }])
  const [road] = grading.roads()
  const steepest = Math.max(...road.profile.map((sample) => Math.abs(sample.grade)))
  assert.ok(steepest <= kind.maxGrade + 0.005, `steepest grade ${(steepest * 100).toFixed(0)}%`)
})

test('the shipped roads drain: every hollow their grading makes empties through a culvert', async () => {
  const { highwoodHeightmap } = await import('../src/assets/geometry/highwood-heightmap.ts')
  const { groundHeight, originalCoastRadius, roadCulverts, waterLevel } = await import('../src/terrain.ts')
  const { authoredShare } = await import('../src/worlds/starter/generation/protection.ts')
  const culverts = roadCulverts()
  const { west, south, cell, columns, rows } = highwoodHeightmap
  const { groupM, stepM } = (await import('../src/assets/geometry/road-kinds.ts')).roadDrainage
  // Steepest descent from a grid of Highwood land points, as the terrain's own drainage test does,
  // except that water reaching a culvert's inlet carries on from its outlet. Steps are a metre, the
  // road raster's cell, so water follows a ditch along a road rather than stepping over it.
  const stuckOn = (ground, useCulverts) => {
    let stuck = 0, traced = 0
    for (let z = 4; z < rows - 4; z += 9) {
      for (let x = 4; x < columns - 4; x += 9) {
        let point = { x: west + x * cell, z: south + z * cell }
        if (ground(point) < waterLevel + 0.5 || authoredShare(point, originalCoastRadius(point)) > 0) continue
        traced++
        const used = new Set()
        for (let step = 0; step < 1800; step++) {
          let best = point, lowest = ground(point)
          for (let a = 0; a < 8; a++) {
            const next = { x: point.x + Math.cos(a * Math.PI / 4) * stepM, z: point.z + Math.sin(a * Math.PI / 4) * stepM }
            if (ground(next) < lowest) [best, lowest] = [next, ground(next)]
          }
          if (lowest < waterLevel) break
          if (best !== point) {
            point = best
            continue
          }
          const culvert = useCulverts && culverts.find((c) => !used.has(c) && Math.hypot(c.inlet.x - point.x, c.inlet.z - point.z) < groupM)
          if (culvert) {
            used.add(culvert)
            point = culvert.outlet
            continue
          }
          if (ground(point) - waterLevel > 0.3) stuck++
          break
        }
      }
    }
    return { stuck, traced }
  }
  const natural = stuckOn(naturalGroundHeight, false), graded = stuckOn(groundHeight, true)
  assert.ok(culverts.length > 0, 'the roads have culverts')
  assert.ok(graded.stuck <= natural.stuck + 2, `${graded.stuck} of ${graded.traced} traces stop on graded ground with culverts, against ${natural.stuck} on natural ground`)
})
