import assert from 'node:assert/strict'
import test from 'node:test'
import { depotJunction, depotLane, distanceToRoads, distanceToRoute, harborRoad } from '../src/routes.ts'
import { islandRocks, islandTrees } from '../src/scenery.ts'
import { deckTop, ferrySolids } from '../src/ferry-repair.ts'
import { solidTop } from '../src/gate-repair.ts'
import { createCargoPhysics } from '../src/simulation/cargo.ts'
import { stepPlayer } from '../src/simulation/movement.ts'
import { coastRadius, groundHeight, shoreProfile, waterLevel } from '../src/terrain.ts'
import { parkedGroundPose } from '../src/truck-pose.ts'
import { flatbedGroundDrive } from '../src/vehicles/flatbed.ts'
import { buildings, distance, ferryTerminal, harborDock, mendingBench, offset, truckStart, wrenCottage } from '../src/world.ts'
import { ferryYard, inFerryYard, rampDeck, tallyBoard, yardDrop } from '../src/worlds/starter/ferry-terminal.ts'

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

test('the barrier stops the flatbed before restoration; afterwards it drives straight onto the ramp and stops dry', () => {
  const closed = { ferryRepair: { stage: 0, ledger: [], haul: 0 } }
  const restored = { ferryRepair: { stage: 3, ledger: [], haul: 0 } }
  function drive(state) {
    const physics = createCargoPhysics()
    physics.placeFerry(state)
    let truck = physics.parkTruck({ x: ferryTerminal.x, z: harborRoad[1].z, heading: Math.PI })
    for (let i = 0; i < 420; i++) truck = physics.step([], truck, { x: 0, z: 1 }, 1 / 30)
    return truck
  }
  const blocked = drive(closed)
  assert.ok(blocked.z > ferryTerminal.z && Math.abs(blocked.x - ferryTerminal.x) < .5, `stopped before the barrier at ${blocked.z}`)
  const ramp = drive(restored)
  assert.ok(ramp.z < rampDeck.near - 5, `drove onto the deck to ${ramp.z}`)
  assert.ok(ramp.y > waterLevel && Math.abs(ramp.x - ferryTerminal.x) < .5 && Math.abs(ramp.speed) < .2)
  assert.ok(deckTop(offset(ramp, 0, 1.9)) > -Infinity || deckTop(ramp) > -Infinity, 'the shore check stops it on the deck')
})

test('the crew walks the restored deck without wading, and the barrier blocks the lane until then', () => {
  const walker = (state, z, ticks = 120) => {
    const motion = { player: { x: ferryTerminal.x, z, y: 0, heading: Math.PI, grounded: true, onBed: false, swimming: false }, verticalSpeed: 0 }
    const pose = parkedGroundPose(truckStart, flatbedGroundDrive.wheels, groundHeight)
    for (let i = 0; i < ticks; i++) {
      stepPlayer(motion, pose, pose, { x: 0, z: -1 }, false, 1 / 30, (point, pad) => solidTop(ferrySolids(state), point, pad))
    }
    return motion.player
  }
  assert.ok(walker({ ferryRepair: { stage: 2, ledger: [], haul: 0 } }, ferryTerminal.z + 2).z > ferryTerminal.z)
  const out = walker({ ferryRepair: { stage: 3, ledger: [], haul: 0 } }, rampDeck.near + 1, 38)
  assert.ok(out.z < rampDeck.far + 4 && groundHeight(out) < waterLevel - .5, 'out over deep water')
  assert.ok(!out.swimming && Math.abs(out.y - deckTop(out)) < .01, JSON.stringify(out))
})
