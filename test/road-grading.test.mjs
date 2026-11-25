import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds, roadProfileSolver } from '../src/assets/geometry/road-kinds.ts'
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

// The deepest centreline cut and fill the shipped roads may have; the landings deepened the cuts.
const maxCentreCutM = 4.5
const maxCentreFillM = 4
// The shipped roads' culverts, and how many of them have an outlet.
const shippedCulverts = { all: 18, withOutlet: 17 }

test('the shipped roads keep their centreline cuts and fills within limits', () => {
  const shipped = createRoadGrading(starterRoads, naturalGroundHeight)
  for (const road of shipped.roads()) {
    const cut = Math.max(...road.profile.map((s) => s.cut)), fill = Math.max(...road.profile.map((s) => -s.cut))
    assert.ok(cut <= maxCentreCutM, `${road.name} cuts ${cut.toFixed(2)} m deep`)
    assert.ok(fill <= maxCentreFillM, `${road.name} fills ${fill.toFixed(2)} m high`)
  }
})

test('every shipped branch leaves the road it joins on a gentle landing before it climbs', () => {
  const { lengthM, maxGrade } = roadProfileSolver.landing
  const shipped = createRoadGrading(starterRoads, naturalGroundHeight)
  const { roads, junctions } = shipped.network()
  let landings = 0
  for (const { branch, end } of junctions) {
    const graded = shipped.roads().find((road) => road.id === roads[branch].id)
    if (!graded) continue
    const { profile } = graded
    const near = end === 'start' ? profile.filter((s) => s.along - profile[0].along < lengthM) : profile.filter((s) => profile.at(-1).along - s.along < lengthM)
    const steepest = Math.max(...near.map((s) => Math.abs(s.grade)))
    assert.ok(steepest <= maxGrade + 1e-9, `${graded.name} leaves its road at ${(steepest * 100).toFixed(1)}%`)
    landings++
  }
  assert.ok(landings >= 4, `checked ${landings} landings`)
})

test('the shipped roads join where they are meant to, so a moved dot or reordered road cannot leave a branch loose', () => {
  const { roads, junctions } = createRoadGrading(starterRoads, naturalGroundHeight).network()
  const found = junctions.map(({ branch, host, end }) => `${roads[branch].id}.${end} -> ${roads[host].id}`).sort()
  assert.deepEqual(found, [
    'cairn-ridge-road.end -> summit-spur',
    'cairn-ridge-road.start -> pine-draw-road',
    'depot-lane.end -> harbor-road',
    'fire-road.start -> harbor-road',
    'pine-draw-road.start -> fire-road',
    'summit-spur.start -> fire-road',
  ])
})

test('a shipped branch leaves its road where the network says it joins, at a steep enough angle not to run along it', async () => {
  const { roadNetwork } = await import('../src/assets/geometry/road-kinds.ts')
  const shipped = createRoadGrading(starterRoads, naturalGroundHeight)
  const { roads, junctions } = shipped.network()
  const graded = shipped.roads()
  for (const { branch, host, end, hostSample } of junctions) {
    const road = graded.find((g) => g.id === roads[branch].id)
    if (!road) continue
    // The branch's graded end, after trimming inside its host, is at the junction's mouth. A branch
    // leaving at 30 degrees or more crosses the host's half formation within twice its width; a
    // shallower one slides along the host, and a junction should be near a right angle.
    const at = end === 'start' ? road.profile[0] : road.profile.at(-1)
    const join = roads[host].samples[hostSample]
    const gap = Math.hypot(at.x - join.x, at.z - join.z)
    const halfFormation = graded.find((g) => g.id === roads[host].id)?.halfFormation ?? roadNetwork.mouthBlendM
    assert.ok(gap <= halfFormation / Math.sin(Math.PI / 6) + 1, `${roads[branch].name} runs ${gap.toFixed(0)} m along ${roads[host].name} before leaving it`)
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

test('the shipped roads drain: water that reaches the sea over the natural ground still does, through the culverts', async () => {
  const { highwoodHeightmap } = await import('../src/assets/geometry/highwood-heightmap.ts')
  const { groundHeight, originalCoastRadius, waterLevel } = await import('../src/terrain.ts')
  const { roadCulverts } = await import('../src/roads.ts')
  const { authoredShare } = await import('../src/worlds/starter/generation/protection.ts')
  const { roadDrainage } = await import('../src/assets/geometry/road-kinds.ts')
  const { highwoodAuthoredLimit } = await import('../src/worlds/starter/layout/highwood-planting.ts')
  const culverts = roadCulverts()
  // Pinned so a regrade that adds or drops a culvert is noticed; update the counts in
  // docs/backcountry.md and the forest roads page with it.
  assert.deepEqual([culverts.length, culverts.filter((c) => c.outlet).length], [shippedCulverts.all, shippedCulverts.withOutlet], 'the shipped culvert count changed')
  // Every pond deeper than a puddle drains; a shallower one may stand on level ground.
  assert.deepEqual(culverts.filter((c) => !c.outlet && c.depth >= roadDrainage.sinkM).map((c) => `${c.road} at ${c.along.toFixed(0)} m`), [])
  const { west, south, cell, columns, rows } = highwoodHeightmap
  // Water moves over the same 1 m lattice the culverts are found on, to any of eight neighbours.
  const lattice = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  const neighbours = (point) => lattice.map(([dx, dz]) => ({ x: point.x + dx * roadDrainage.stepM, z: point.z + dz * roadDrainage.stepM }))
  const key = ({ x, z }) => `${x},${z}`
  // Lower ground reachable without climbing more than a puddle's depth, within a few metres: water
  // spills out of a dimple shallower than the culverts' pond threshold.
  const spill = (ground, point) => {
    const floor = ground(point), seen = new Set([key(point)]), queue = [point]
    while (queue.length) {
      const at = queue.shift()
      for (const next of neighbours(at)) {
        if (seen.has(key(next)) || Math.hypot(next.x - point.x, next.z - point.z) > 10 || ground(next) > floor + roadDrainage.pondM) continue
        if (ground(next) < floor) return next
        seen.add(key(next))
        queue.push(next)
      }
    }
    return undefined
  }
  // Steepest descent, so water follows a ditch along a road rather than stepping over it. Water
  // leaves Highwood at the sea or on the authored village plain, whose own drains take it on.
  const reachesSea = (ground, start, useCulverts) => {
    let point = { x: Math.round(start.x), z: Math.round(start.z) }
    const used = new Set()
    for (let step = 0; step < 4000; step++) {
      if (ground(point) <= waterLevel + roadDrainage.pondM || authoredShare(point, originalCoastRadius(point)) >= highwoodAuthoredLimit) return true
      const best = neighbours(point).reduce((low, next) => (ground(next) < ground(low) ? next : low), point)
      if (best !== point) {
        point = best
        continue
      }
      const out = spill(ground, point)
      if (out) {
        point = out
        continue
      }
      // A culvert takes water only from its own basin: an inlet beside the stuck point, no higher.
      const culvert = useCulverts && culverts.find((c) => c.outlet && !used.has(c) && Math.hypot(c.inlet.x - point.x, c.inlet.z - point.z) < 3 && groundHeight(c.inlet) <= ground(point) + roadDrainage.pondM)
      if (!culvert) return false
      used.add(culvert)
      point = { x: Math.round(culvert.outlet.x), z: Math.round(culvert.outlet.z) }
    }
    return false
  }
  // A grid of Highwood land points, plus the head of Alder Creek, whose headwater crosses the
  // junction where the fire road meets the Pine Draw road.
  const starts = [{ x: -255, z: 345 }, { x: -240, z: 352 }, { x: -262, z: 338 }]
  for (let z = 4; z < rows - 4; z += 9) {
    for (let x = 4; x < columns - 4; x += 9) {
      const point = { x: west + x * cell, z: south + z * cell }
      if (groundHeight(point) > waterLevel + 0.5 && authoredShare(point, originalCoastRadius(point)) <= 0) starts.push(point)
    }
  }
  const cutOff = starts.filter((start) => reachesSea(naturalGroundHeight, start, false) && !reachesSea(groundHeight, start, true))
  assert.deepEqual(cutOff.map(({ x, z }) => `(${x.toFixed(0)}, ${z.toFixed(0)})`), [], 'water that reaches the sea over natural ground is cut off by the roads')
})
