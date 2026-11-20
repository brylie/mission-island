import assert from 'node:assert/strict'
import test from 'node:test'
import { daySeconds } from '../src/weather.ts'
import { hiveEntrances, honeyAction, honeyReward, honeyStops, pollinatorsAt } from '../src/second-island/long-acre.ts'

const dry = { hour: 10.5, rain: 0 }
const rain = { hour: 10.5, rain: .82 }
const steadyDry = () => 0
const steadyRain = () => .82
const afterShower = time => time < 0 ? .82 : 0

test('steady rain shelters the colony, then the sheltered bed receives the first returning bees', () => {
  const clear = pollinatorsAt(6.4, dry, steadyDry)
  const wet = pollinatorsAt(6.4, rain, steadyRain)
  const recovering = pollinatorsAt(6.4, dry, afterShower)
  assert.equal(clear.phase, 'Foraging')
  assert.ok(clear.bees.some(bee => bee.activity === 'feeding' && bee.bed !== 0))
  assert.equal(wet.phase, 'Sheltering')
  assert.ok(wet.bees.every(bee => bee.activity === 'resting'))
  assert.equal(recovering.phase, 'Returning')
  assert.ok(recovering.bees.some(bee => bee.bed === 0 && bee.activity === 'feeding'))
  assert.ok(recovering.bees.every(bee => bee.bed <= 0))
  assert.equal(pollinatorsAt(15, dry, afterShower).phase, 'Foraging')
})

test('a seek or late arrival reproduces the same bee positions, and another day varies the forage route', () => {
  const first = pollinatorsAt(6.4, dry, steadyDry)
  pollinatorsAt(6.4, rain, steadyRain)
  assert.deepEqual(first, pollinatorsAt(6.4, dry, steadyDry))
  assert.notDeepEqual(first.bees, pollinatorsAt(daySeconds + 6.4, dry, steadyDry).bees)
  const oncoming = (time) => time < 5 ? 0 : .82
  assert.ok(pollinatorsAt(6, rain, oncoming).bees.some(bee => bee.activity === 'flight'))
  assert.ok(pollinatorsAt(9, rain, oncoming).bees.every(bee => bee.activity === 'resting'))
})

test('dry foragers complete staggered round trips through their own hive entrances', () => {
  const frames = Array.from({ length: 640 }, (_, frame) => pollinatorsAt(frame / 20, dry, steadyDry).bees)
  const returns = frames[0].map((_, i) => {
    const samples = frames.map(bees => bees[i])
    const approaching = samples.findIndex(bee => bee.activity === 'flight' && bee.hivebound)
    const landed = samples.findIndex((bee, frame) => frame > approaching && bee.activity === 'landing' && bee.hivebound)
    const inside = samples.findIndex((bee, frame) => frame > landed && bee.activity === 'resting')
    const departing = samples.findIndex((bee, frame) => frame > inside && bee.activity === 'landing' && !bee.hivebound)
    assert.ok(approaching >= 0 && landed > approaching && inside > landed && departing > inside)
    const entrance = hiveEntrances[i % hiveEntrances.length]
    assert.ok(Math.abs(samples[landed].x - entrance.x) <= .12 && samples[landed].z > entrance.z)
    assert.ok(samples[inside].z < entrance.z)
    assert.ok(samples.slice(departing).some(bee => bee.activity === 'feeding'))
    assert.ok(samples.every((bee, frame) => frame === 0 ||
      Math.hypot(bee.x - samples[frame - 1].x, bee.z - samples[frame - 1].z) < .25))
    return approaching
  })
  assert.equal(new Set(returns).size, returns.length)
  assert.ok(frames.some(bees => bees.some(bee => bee.activity === 'feeding') && bees.some(bee => bee.hivebound)))
})

test('the one-jar trial requires the field kit, fills at the extractor, and can pay only once at market', () => {
  assert.equal(honeyAction('kit', honeyStops.extractor), undefined)
  assert.equal(honeyAction('kit', honeyStops.kit).next, 'empty')
  assert.equal(honeyAction('empty', honeyStops.market), undefined)
  assert.equal(honeyAction('empty', honeyStops.extractor).next, 'filled')
  assert.equal(honeyAction('filled', honeyStops.extractor), undefined)
  assert.equal(honeyAction('filled', honeyStops.market).next, 'delivered')
  assert.equal(honeyReward, 4)
  assert.equal(honeyAction('delivered', honeyStops.market), undefined)
})
