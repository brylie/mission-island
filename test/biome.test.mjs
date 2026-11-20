import assert from 'node:assert/strict'
import test from 'node:test'
import { URL, URLSearchParams } from 'node:url'
import { createBiome } from '../src/workbench/biome-model.ts'
import { biomeLink, codex, parseRecipeFile, presets, serializeRecipe, readRecipe, recipeFromLink } from '../src/workbench/biome-recipe.ts'

const meadow = presets['Meadow edge']
const run = (changes, time) => createBiome({ ...meadow, ...changes }).seek(time)
const noCover = { grass: 0, trees: 0, logs: 0, stones: 0 }
const stock = s => s.patches.filter(p => p.kind === 'clover').reduce((n, p) => n + p.stock, 0)

test('each preset round trips through a clean share link; malformed numbers stay bounded', () => {
  for (const recipe of Object.values(presets)) {
    const url = new URL(biomeLink('https://name:password@island.local:5173/island/workbench.html?session=private', recipe))
    assert.equal(url.host, 'island.local:5173')
    assert.equal(url.pathname, '/island/workbench.html')
    assert.equal(url.hash, '#biome')
    assert.equal(url.username + url.password, '')
    assert.equal(url.searchParams.has('session'), false)
    assert.deepEqual(recipeFromLink(url.searchParams), recipe)
  }
  assert.equal(recipeFromLink(new URLSearchParams('recipe=3')), undefined)
  assert.deepEqual(recipeFromLink(new URLSearchParams('recipe=1&rain=Infinity&hour=&logs=-9&hares=800&trees=1.7&ground=ice')),
    { ...meadow, logs: 0, hares: 10, trees: 2 })
  assert.deepEqual(readRecipe({}), meadow)
})

test('changing one ingredient preserves the positions of the others', () => {
  const reference = run({}, 0), edited = run({ grass: 0, hares: 1 }, 0)
  assert.deepEqual(edited.patches, reference.patches.filter(p => p.kind !== 'grass'))
  assert.deepEqual(edited.hares, reference.hares.slice(0, 1))
  assert.deepEqual(edited.foxes, reference.foxes)
  assert.notDeepEqual(run({ seed: 5 }, 0).hares, reference.hares)
})

test('scrubbing back or advancing in uneven frames reproduces a direct seek', () => {
  const stepped = createBiome(meadow)
  for (const t of [0, .07, 1.23, 4.88, 31.008, 67]) stepped.seek(t)
  for (const t of [67, 2, 0, 65.9]) assert.deepEqual(stepped.seek(t), run({}, t))
})

test('hares graze, flee, and escape into cover; clearing cover changes the outcome', () => {
  const sheltered = run({}, 60), exposed = run(noCover, 60)
  assert.ok(sheltered.grazed > 0 && sheltered.escapes > 0)
  assert.equal(exposed.escapes, 0)
  assert.ok(exposed.encounters > sheltered.encounters)
  assert.ok(stock(sheltered) < meadow.clover)
  assert.ok(sheltered.patches.every(p => p.stock >= 0 && p.stock <= 1))
})

test('heavy rain sends hares to logs and trees, and exposed hares keep searching for food', () => {
  const storm = { rain: 90, foxes: 0 }
  assert.ok(run(storm, 30).hares.every(h => h.behavior === 'sheltering'))
  assert.ok(run({ ...storm, trees: 0, logs: 0 }, 30).grazed > 0)
})

test('without predators, lightly rained-on clover replenishes faster in daylight than at night', () => {
  const clearing = { foxes: 0, hares: 1, clover: 1, ...noCover }
  const findRecovery = (hour, rain) => {
    const sim = createBiome({ ...meadow, ...clearing, hour, rain })
    let previous = 1
    for (let i = 1; i <= 900; i++) {
      const amount = stock(sim.seek(i / 10))
      if (amount > previous) return amount - previous
      previous = amount
    }
    assert.fail('The grazed patch should regrow')
  }
  assert.ok(findRecovery(12, 50) > findRecovery(12, 0))
  assert.ok(findRecovery(12, 0) > findRecovery(22, 0))
})

test('zero populations, an empty clearing and a full clearing all simulate through a complete trial', () => {
  const empty = Object.fromEntries(codex.map(c => [c.key, 0]))
  assert.deepEqual(run(empty, 90), { hares: [], foxes: [], patches: [], escapes: 0, grazed: 0, encounters: 0 })
  const noFood = run({ ...empty, hares: 4, foxes: 2 }, 90)
  assert.equal(noFood.grazed, 0)
  assert.equal(noFood.hares.length, 4)
  const full = run(Object.fromEntries(codex.map(c => [c.key, c.max])), 90)
  for (const point of [...full.foxes, ...full.hares]) assert.ok(Math.hypot(point.x, point.z) < 8)
})

test('versioned files reproduce a recipe and reject invalid edits', () => {
  for (const recipe of Object.values(presets)) assert.deepEqual(parseRecipeFile(serializeRecipe(recipe)), recipe)
  for (const data of [null, { version: 2 }, { version: 1, recipe: null }, { version: 1, recipe: {} },
    { version: 1, recipe: { ...meadow, foxes: -1 } }]) assert.throws(() => parseRecipeFile(JSON.stringify(data)))
  assert.throws(() => parseRecipeFile('{'), SyntaxError)
})
