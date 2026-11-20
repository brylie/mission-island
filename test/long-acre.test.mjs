import assert from 'node:assert/strict'
import test from 'node:test'
import { daySeconds } from '../src/weather.ts'
import { honeyAction, honeyReward, honeyStops, pollinatorsAt } from '../src/second-island/long-acre.ts'

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
