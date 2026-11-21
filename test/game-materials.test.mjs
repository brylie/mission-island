import assert from 'node:assert/strict'
import { blankRecord } from '../src/residents/trust.ts'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { islandSaveFile } from '../server/save.ts'
import { actionHint, interactRequest } from '../src/actions.ts'
import { gateFavor } from '../src/gate-repair.ts'
import { interactions } from '../src/interaction-options.ts'
import { carriedMaterial, materialsGuide, repairMaterials, repairQuantity } from '../src/materials-work.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { waterLevel } from '../src/terrain.ts'
import { distance } from '../src/world.ts'
import { materialSources, repairChoices, repairSite, sampleTray } from '../src/worlds/starter/materials.ts'
import { repairSupplyFavor } from '../src/worlds/starter/residents/wren.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const bench = { x: -27.1, z: -24.1 }
const timberTrail = [{ x: -26.5, z: -10 }, { x: -26.65, z: 12.45 }]
const stoneTrail = [{ x: -22, z: -11 }, { x: -20, z: -11 }, { x: 10, z: 12 }, { x: 32, z: 12 },
  { x: 35, z: 11 }, { x: 32, z: 3 }, { x: 30, z: -24 }, { x: 41.5, z: -26 }]
const trails = { timber: timberTrail, stone: stoneTrail }

function afterGate(save) {
  save.islandTime = 480
  Object.assign(save.world, { mission: 'complete', fire: 0,
    gateRepair: { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 } })
  save.world.residents.wren = { ...blankRecord(), trust: 1, kept: [gateFavor] }
  save.crewCoins = 5
  // An island made before material progress existed can start the checkout.
  delete save.world.materialsWork
}

function makeArchive(t) {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-materials-'))
  t.after(() => rmSync(root, { recursive: true }))
  return islandSaveFile(root, 5194)
}

function walk(h, client, target, range = .35) {
  for (let i = 0; i < 440 && distance(client.player, target) > range; i++) {
    const d = distance(client.player, target)
    h.input(client, { x: (target.x - client.player.x) / d, z: (target.z - client.player.z) / d, sprint: true })
    h.advance()
  }
  h.input(client)
  h.advance()
  assert.ok(distance(client.player, target) <= range, `walk to ${target.x}, ${target.z} from ${client.player.x}, ${client.player.z}`)
  assert.equal(client.player.swimming, false)
}

function walkToSource(h, client, material) {
  for (const point of trails[material]) walk(h, client, point)
  walk(h, client, materialSources[material], 1.45)
}

function returnToBench(h, client, material) {
  for (const point of [...trails[material]].reverse()) walk(h, client, point)
  walk(h, client, bench)
}

function request(client, action, material) {
  client.request('interact', { choice: { action, subject: repairMaterials.indexOf(material) } })
}

function act(h, client, action, material) {
  const subject = repairMaterials.indexOf(material)
  const option = interactions(client.state, client.player).find((choice) => choice.action === action && choice.subject === subject)
  assert.ok(option, `${action} ${material} should be in reach, at ${client.player.x}, ${client.player.z}`)
  assert.deepEqual(interactRequest(client.state, client.player, option), { type: 'interact', choice: { action, subject } })
  assert.equal(actionHint(client.state, client.player, option)[1], option.label)
  request(client, action, material)
  h.advance()
}

function gather(h, client, material, count) {
  for (let i = 0; i < count; i++) {
    h.advanceUntil(() => client.state.islandTime >= client.state.materialsWork.readyAt[material], 125)
    act(h, client, 'gather-material', material)
  }
}

function sample(h, client, material) {
  walkToSource(h, client, material)
  gather(h, client, material, 1)
  returnToBench(h, client, material)
  act(h, client, 'return-material-sample', material)
  assert.equal(carriedMaterial(client.player, material), 0)
}

function choose(h, client, material) {
  walk(h, client, { x: repairChoices[material].x + .9, z: repairChoices[material].z })
  act(h, client, 'choose-repair-material', material)
  assert.deepEqual(client.state.materialsWork.request, { material, delivered: 0 })
}

function returnToEdging(h, client, material) {
  returnToBench(h, client, material)
  walk(h, client, { x: repairSite.x + 1.2, z: repairSite.z })
}

function awardCount(client) {
  return client.messages.filter(({ type, favor }) => type === 'favor-pay' && favor === repairSupplyFavor.id).length
}

for (const material of repairMaterials) {
  test(`a solo player walks both outings and repairs the edging with ${material}`, (t) => {
    const archive = makeArchive(t)
    const initial = setup(t, { players: [player(0, bench)], arrange: afterGate })
    const oldSave = initial.game.snapshotForSave()
    delete oldSave.world.materialsWork
    archive.write(oldSave)
    const h = setup(t, { saved: archive.load() })
    const a = h.join(tokens[0])
    assert.equal(a.state.materialsWork.checkout, 'timber')
    assert.match(materialsGuide(a.state, a.player).next, /Meadow Slope Path/)
    sample(h, a, 'timber')
    assert.match(materialsGuide(a.state, a.player).next, /Splitstone Strand/)
    sample(h, a, 'stone')
    assert.equal(a.state.materialsWork.checkout, 'qualified')
    assert.equal(a.state.crewCoins, 5)
    choose(h, a, material)
    walkToSource(h, a, material)
    gather(h, a, material, repairQuantity)
    h.advanceUntil(() => a.state.islandTime >= a.state.materialsWork.readyAt[material], 125)
    act(h, a, 'check-material', material)
    request(a, 'gather-material', material)
    h.advance()
    assert.equal(carriedMaterial(a.player, material), repairQuantity)
    returnToEdging(h, a, material)
    for (let i = 0; i < repairQuantity; i++) act(h, a, 'deliver-repair-material', material)
    assert.deepEqual(a.state.materialsWork.request, { material, delivered: 2 })
    assert.match(materialsGuide(a.state, a.player).detail, new RegExp(`sections of ${material} edging are in place`))
    assert.equal(carriedMaterial(a.player, material), 0)
    assert.equal(a.state.crewCoins, 10)
    assert.equal(awardCount(a), 1)
    assert.deepEqual(a.state.residents.wren, { ...blankRecord(), trust: 2, kept: [gateFavor, repairSupplyFavor.id] })
  })

  test(`split ${material} collection, reconnect, and concurrent final delivery award and consume once`, (t) => {
    const archive = makeArchive(t)
    const h = setup(t, { players: [player(0, bench), player(1, bench)], arrange: afterGate })
    const a = h.join(tokens[0]), b = h.join(tokens[1])
    sample(h, a, 'timber')
    assert.equal(b.state.materialsWork.checkout, 'stone')
    sample(h, b, 'stone')
    assert.equal(a.state.materialsWork.checkout, 'qualified')
    for (const client of [a, b]) assert.equal(client.messages.filter(({ step }) => step === 'qualified').length, 1)
    choose(h, a, material)
    walkToSource(h, a, material)
    walkToSource(h, b, material)
    request(a, 'gather-material', material)
    request(b, 'gather-material', material)
    h.advance()
    assert.equal(carriedMaterial(a.player, material), 1)
    assert.equal(carriedMaterial(b.player, material), 0, 'the same sample cannot be picked up twice')
    gather(h, b, material, 1)
    gather(h, a, material, 1)
    returnToEdging(h, a, material)
    returnToEdging(h, b, material)
    act(h, a, 'deliver-repair-material', material)
    assert.equal(b.state.materialsWork.request.delivered, 1)
    const partial = h.checkpoint.mock.calls.at(-1).result
    assert.equal(partial.world.materialsWork.request.delivered, 1)
    assert.equal(partial.crew[0].player.materials[material], 1)
    assert.equal(partial.crewCoins, 5)
    archive.write(partial)
    assert.deepEqual(archive.load().world.materialsWork.request, { material, delivered: 1 })
    b.close()
    h.elapse(12_050)
    const rejoined = h.join(tokens[1])
    assert.equal(rejoined.state.materialsWork.checkout, 'qualified')
    assert.equal(carriedMaterial(rejoined.player, material), 1)
    assert.match(materialsGuide(rejoined.state, rejoined.player).detail, new RegExp(`1 ${material} still needed`))
    const other = repairMaterials.find((kind) => kind !== material)
    request(rejoined, 'deliver-repair-material', other)
    assert.equal(a.state.materialsWork.request.delivered, 1)
    for (const client of [a, rejoined]) assert.ok(interactions(client.state, client.player).some(({ action }) => action === 'deliver-repair-material'))
    request(rejoined, 'deliver-repair-material', material)
    request(a, 'deliver-repair-material', material)
    h.advance()
    for (const client of [a, rejoined]) {
      assert.deepEqual(client.state.materialsWork.request, { material, delivered: 2 })
      assert.equal(client.state.crewCoins, 10)
      assert.equal(awardCount(client), 1)
    }
    assert.equal(carriedMaterial(a.player, material), 1, 'the losing final request consumes nothing')
    assert.equal(carriedMaterial(rejoined.player, material), 0)
    const committed = h.checkpoint.mock.calls.find(({ result }) => result.world.materialsWork?.request?.delivered === 2).result
    assert.deepEqual(committed.world.lastFavorPay, { resident: 'wren', favor: repairSupplyFavor.id, coins: 5 })
    assert.equal(committed.crew[1].player.materials[material], 0)
    archive.write(committed)
    const resumed = setup(t, { saved: archive.load() })
    const returning = resumed.join(tokens[0]), partner = resumed.join(tokens[1])
    for (const client of [returning, partner]) {
      assert.equal(client.state.materialsWork.checkout, 'qualified')
      assert.deepEqual(client.state.materialsWork.request, { material, delivered: 2 })
      assert.equal(client.state.crewCoins, 10)
      assert.equal(awardCount(client), 0)
    }
    request(returning, 'deliver-repair-material', material)
    resumed.advance()
    assert.equal(carriedMaterial(returning.player, material), 1)
    for (const kind of repairMaterials) {
      walk(resumed, partner, bench)
      walkToSource(resumed, partner, kind)
      gather(resumed, partner, kind, 1)
      returnToBench(resumed, partner, kind)
    }
    assert.equal(partner.state.crewCoins, 10)
  })
}

test('marked material placements are dry and reach the walking routes', () => {
  for (const point of [sampleTray, repairSite, ...Object.values(materialSources), ...Object.values(repairChoices)]) {
    assert.ok(canWalkAt(point, .36, waterLevel), `${point.x}, ${point.z} has dry clearance`)
  }
})

test('materials remain locked until the gate is mended', (t) => {
  const h = setup(t, { players: [player(0, materialSources.timber)] })
  const a = h.join(tokens[0])
  request(a, 'gather-material', 'timber')
  h.advance()
  assert.equal(carriedMaterial(a.player, 'timber'), 0)
  assert.equal(a.state.materialsWork.checkout, 'timber')
})
