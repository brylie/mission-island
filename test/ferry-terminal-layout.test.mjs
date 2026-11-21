import assert from 'node:assert/strict'
import test from 'node:test'
import { depotJunction, depotLane, distanceToRoads, distanceToRoute, harborRoad } from '../src/routes.ts'
import { islandRocks, islandTrees } from '../src/scenery.ts'
import { coastRadius, shoreProfile } from '../src/terrain.ts'
import { buildings, distance, ferryTerminal, harborDock, mendingBench, wrenCottage } from '../src/world.ts'
import { ferryYard, inFerryYard, tallyBoard, yardDrop } from '../src/worlds/starter/ferry-terminal.ts'

const roadEdge = 3 + .7 // half the asphalt plus the gravel shoulder
const grass = shoreProfile[1].radius

test('Harbor Depot road straightens before the yard and runs onto the ferry ramp on one alignment', () => {
  assert.deepEqual(harborRoad[0], { x: ferryTerminal.x, z: ferryTerminal.z })
  assert.equal(harborRoad[1].x, ferryTerminal.x, 'the ramp lane is one straight segment on the terminal centreline')
  assert.ok(harborRoad[1].z >= ferryYard.maxZ, 'the straight begins before the yard entrance')
  assert.ok(harborRoad.at(-1).x > 50, 'the road still reaches Seabrook')
  assert.ok(distanceToRoute(depotJunction, harborRoad) < .01, 'the depot lane meets Harbor Depot road')
  assert.equal(depotLane.at(-1), depotJunction)
})

test('the freight yard sits beside the lane, clear of buildings, scenery and the fishing dock', () => {
  assert.ok(ferryYard.minX >= ferryTerminal.x + roadEdge - .01, 'the yard leaves the ramp lane clear')
  for (const x of [ferryYard.minX, ferryYard.maxX]) for (const z of [ferryYard.minZ, ferryYard.maxZ]) {
    assert.ok(coastRadius({ x, z }) <= grass, `yard corner on grass: ${x}, ${z}`)
  }
  for (const { x, z, w, d } of [...buildings, wrenCottage]) {
    const clear = x + w / 2 < ferryYard.minX || x - w / 2 > ferryYard.maxX || z + d / 2 < ferryYard.minZ || z - d / 2 > ferryYard.maxZ
    assert.ok(clear, `building at ${x}, ${z} stays out of the yard`)
    const overlapsLane = Math.abs(x - ferryTerminal.x) < w / 2 + roadEdge && z - d / 2 < harborRoad[1].z && z + d / 2 > ferryTerminal.z
    assert.ok(!overlapsLane, `building at ${x}, ${z} stays off the ramp lane`)
  }
  for (const thing of [...islandTrees, ...islandRocks]) assert.ok(!inFerryYard(thing), `scenery at ${thing.x}, ${thing.z}`)
  assert.ok(inFerryYard(yardDrop) && distance(yardDrop, { x: harborDock.x, z: harborDock.firstZ }) > 20, 'the timber stack is not the fishing dock')
})

test('the tally board and Wren’s bench stand beside the road, not in it', () => {
  assert.ok(Math.abs(tallyBoard.x - ferryTerminal.x) > ferryTerminal.width / 2 + .7, 'the tally board is outside the barrier span')
  assert.ok(distanceToRoads(tallyBoard) > roadEdge, 'the tally board stands on the verge')
  assert.ok(distanceToRoads(mendingBench) > roadEdge + .8, 'Wren’s bench stands back from the shoulder')
  assert.ok(!inFerryYard(mendingBench), 'Wren’s bench is outside the turning space')
  for (const site of [tallyBoard, mendingBench]) assert.ok(coastRadius(site) <= grass, `on grass: ${site.x}, ${site.z}`)
  const { x, z, w, d } = wrenCottage
  assert.ok(harborRoad.every((point) => Math.abs(point.x - x) > w / 2 + roadEdge + 2 || Math.abs(point.z - z) > d / 2 + roadEdge + 2),
    'the curve to Seabrook passes clear of Wren’s garden')
})
