import assert from 'node:assert/strict'
import test from 'node:test'
import { placeStockpile, stockpiles } from '../src/second-island/stockpiles.ts'
import { surfaceHeight } from '../src/second-island/terrain.ts'
import { placeWalker, ScenerySolids, walkSaltwind } from '../src/second-island/walking.ts'

test('the loader apron stays clear and a walker can cross each loose heap', () => {
  const solids = new ScenerySolids()
  for (const load of stockpiles) placeStockpile(load, solids)
  for (let x = 286; x <= 300; x += .25) assert.equal(solids.at(x, 177, .28).length, 0)
  for (const { id, cx, height } of stockpiles) {
    const walker = placeWalker({ x: cx, z: 177.5 })
    let highest = 0
    for (let i = 0; i < 300; i++) {
      walkSaltwind(walker, solids, 0, 2, false, 1 / 60)
      highest = Math.max(highest, walker.y - surfaceHeight(walker.x, walker.z))
    }
    assert.ok(highest >= height - .20, id + ' crest')
    assert.ok(walker.z > 187, id + ' far side')
    assert.ok(Math.abs(walker.y - surfaceHeight(walker.x, walker.z)) < .02, id + ' ground contact')
  }
})
