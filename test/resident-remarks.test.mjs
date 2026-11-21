import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { chooseRemark, expandRemark, fits, remarkContext } from '../src/residents/remarks.ts'
import { blankRecord } from '../src/residents/trust.ts'
import { daySeconds } from '../src/weather.ts'
import { islandRemarks } from '../src/worlds/starter/island-remarks.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'

const listener = { id: 0, name: 'Sam' }
const base = createGame().tick()

function world(hour, rain = 0, extra = {}) {
  return { ...JSON.parse(JSON.stringify(base)), islandTime: ((hour - 6 + 24) % 24) * daySeconds / 24 + daySeconds, weather: { hour, rain }, ...extra }
}

const moments = [[7, 0], [10, 0], [13, 1], [16, .5], [19, 0], [23, 0], [2, 1]]

test('every resident has something fitting to say at every hour and in any weather, and every token fills', () => {
  for (const resident of starterResidents) {
    for (const [hour, rain] of moments) {
      const context = remarkContext(resident, world(hour, rain), listener)
      const fitting = [...resident.remarks ?? [], ...islandRemarks].filter((remark) => fits(remark, context))
      assert.ok(fitting.length >= 3, `${resident.id} at ${hour}h, rain ${rain}: ${fitting.length}`)
      for (const remark of fitting) {
        for (let seed = 0; seed < 4; seed++) {
          const text = expandRemark(remark.text, context, () => seed / 4)
          assert.doesNotMatch(text, /[{}]/, text)
        }
      }
    }
  }
})

test('remarks follow the weather, the hour and where the resident is', () => {
  const mara = starterResidents.find(({ id }) => id === 'mara')
  const dry = remarkContext(mara, world(10), listener)
  const wet = remarkContext(mara, world(10, 1), listener)
  const rainy = islandRemarks.filter(({ rain }) => rain === true)
  assert.ok(rainy.every((remark) => fits(remark, wet) && !fits(remark, dry)))
  assert.equal(dry.stop, 'work')
  assert.equal(remarkContext(mara, world(23), listener).stop, 'home')
  const night = islandRemarks.find(({ text }) => text.startsWith('You’re out late'))
  assert.ok(fits(night, remarkContext(mara, world(23), listener)) && !fits(night, dry), 'the night window wraps past midnight')
  assert.equal(expandRemark('{hello}, {listener}. Enjoying {sky}?', dry, () => 0), 'Morning, Sam. Enjoying the sunshine?')
  assert.equal(expandRemark('{hello}, {listener}. Enjoying {sky}?', wet, () => 0), 'Morning, Sam. Enjoying this rain?')
})

test('the same seed gives the same remark, talking again avoids a repeat, and the variety is real', () => {
  const ines = starterResidents.find(({ id }) => id === 'ines')
  const context = remarkContext(ines, world(10), listener)
  assert.deepEqual(chooseRemark(ines, islandRemarks, context, 42), chooseRemark(ines, islandRemarks, context, 42))
  const said = new Set()
  let last
  for (let talk = 0; talk < 30; talk++) {
    const remark = chooseRemark(ines, islandRemarks, context, talk * 7919, last)
    assert.notEqual(remark.template, last, 'no remark twice in a row')
    last = remark.template
    said.add(remark.text)
  }
  assert.ok(said.size >= 5, `${said.size} different remarks in 30 talks`)
})

test('word gets around: neighbors mention kept favors and a broken promise, but not their own', () => {
  const residents = { ...base.residents,
    mara: { ...blankRecord(), trust: 1, kept: ['mara-supper'] },
    wren: { ...blankRecord(), kept: ['wren-gate'], active: 'wren-swell', breach: { favor: 'wren-swell', at: 0, amended: false, rebuilt: 0 } } }
  const state = world(10, 0, { residents })
  const gossip = (id, start) => fits(islandRemarks.find(({ text }) => text.startsWith(start)),
    remarkContext(starterResidents.find((resident) => resident.id === id), state, listener))
  assert.ok(gossip('ines', 'Mara says you brought her carrots'))
  assert.ok(!gossip('mara', 'Mara says you brought her carrots'), 'Mara thanks the crew herself')
  assert.ok(gossip('bram', 'Wren seemed upset'))
  assert.ok(!gossip('wren', 'Wren seemed upset'))
  // Nobody praises the first repair while the gate is swollen again.
  const swollen = world(10, 0, { residents, gateRepair: { stage: 'mended', pinHolder: null, mendedAt: 0, swelling: 'swollen' } })
  const praise = islandRemarks.find(({ text }) => text.startsWith('Wren’s gate swings like new'))
  const ines = starterResidents.find(({ id }) => id === 'ines')
  assert.ok(!fits(praise, remarkContext(ines, swollen, listener)))
  assert.ok(fits(praise, remarkContext(ines, world(10, 0, { residents, gateRepair: { stage: 'mended', pinHolder: null, mendedAt: 0 } }), listener)))
  const wren = starterResidents.find(({ id }) => id === 'wren')
  const wary = wren.remarks.filter(({ standing }) => standing?.includes('wronged'))
  assert.ok(wary.length >= 2 && wary.every((remark) => fits(remark, remarkContext(wren, state, listener))))
})
