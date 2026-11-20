import { createJuniperHabitat, juniperCenter, juniperLayout } from '../src/juniper-habitat.ts'
import { groundHeight, waterDepth } from '../src/terrain.ts'
import { starterPropTop } from '../src/starter-colliders.ts'
import { offset, spawns } from '../src/world.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import { URL, URLSearchParams } from 'node:url'
import { habitatNavigation } from '../src/biome-navigation.ts'
import { createBiome, populate } from '../src/biome-model.ts'
import { biomeLink, codex, parseRecipeFile, presets, serializeRecipe, readRecipe, recipeFromLink } from '../src/biome-recipe.ts'

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

test('Juniper Hollow fits the Pine hollow recipe to dry ground and keeps solid props walkable around their edges', () => {
  const { hares, foxes, patches } = juniperLayout
  assert.equal(hares.length, presets['Pine hollow'].hares)
  assert.equal(foxes.length, presets['Pine hollow'].foxes)
  for (const { key } of codex.slice(0, 5)) assert.equal(patches.filter(p => p.kind === key).length, presets['Pine hollow'][key])
  for (const p of patches) {
    const point = { x: p.x + juniperCenter.x, z: p.z + juniperCenter.z }
    assert.equal(waterDepth(point), 0)
    if (p.kind === 'trees') {
      assert.ok(Math.hypot(p.x, p.z) >= 4.8)
      assert.ok(p.z >= 1 || Math.abs(p.x) >= 3.4)
    }
    const solid = ['trees', 'logs', 'stones'].includes(p.kind)
    assert.equal(starterPropTop(point, .02) > groundHeight(point), solid)
  }
})

test('hares and foxes move away from nearby walkers, recover and follow live island rain', () => {
  const habitat = createJuniperHabitat(), dry = { hour: 11, rain: 0 }
  const first = habitat(0, dry, [])
  const p = first.foxes[0]
  const visitor = { x: p.x + juniperCenter.x, z: p.z + juniperCenter.z + .55 }
  const close = habitat(.4, dry, [visitor])
  assert.equal(close.foxes[0].behavior, 'fleeing')
  assert.equal(close.hares[0].behavior, 'fleeing')
  assert.ok(Math.hypot(close.foxes[0].x + juniperCenter.x - visitor.x, close.foxes[0].z + juniperCenter.z - visitor.z) > 1)
  assert.notEqual(habitat(2, dry, []).foxes[0].behavior, 'fleeing')
  const wet = habitat(50, { hour: 12, rain: 1 }, [])
  assert.ok(wet.hares.some(h => h.behavior === 'sheltering'))
  assert.deepEqual(createJuniperHabitat()(20, dry, [spawns[0]]), createJuniperHabitat()(20, dry, []))
})

test('Juniper fox keeps making progress around cover and avoids repeated U-turns near stationary walkers', () => {
  const weather = { rain: 0, hour: 12 }
  const besideTrail = { x: juniperCenter.x, z: juniperCenter.z - 7.8 }
  for (const visitors of [[], [besideTrail], [juniperCenter], [besideTrail, juniperCenter]]) {
    const habitat = createJuniperHabitat()
    let previous = habitat(0, weather, visitors).foxes[0]
    const reversals = []
    const visited = new Set()
    for (let i = 1; i <= 1200; i++) {
      const fox = habitat(i / 10, weather, visitors).foxes[0]
      visited.add(Math.floor(fox.x) + ',' + Math.floor(fox.z))
      const angle = fox.heading - previous.heading
      if (Math.cos(angle) < -.75) reversals.push(i)
      while (reversals.length && i - reversals[0] >= 20) reversals.shift()
      assert.ok(reversals.length < 5, 'Repeated U-turns within two seconds at ' + i / 10)
      previous = fox
    }
    assert.ok(visited.size > 12, 'Fox should travel through the clearing')
  }
})

test('hares and foxes cross low props and take detours around taller or lengthwise obstacles', () => {
  for (const species of ['hares', 'foxes']) {
    for (const [kind, angle, lengthwise, detour] of [
      ['logs', .83, false, false], ['stones', .6, false, false],
      ['stones', 5.8, false, true], ['logs', .83, true, true], ['trees', .4, false, true],
    ]) {
      const recipe = { ...meadow, ...noCover, clover: 0, hares: 0, foxes: 0, [species]: 1 }
      const layout = populate(recipe)
      const center = { x: 0, z: 0, heading: angle }
      const start = offset(center, lengthwise ? -2.4 : 0, lengthwise ? 0 : -2.4)
      const end = offset(center, lengthwise ? 2.4 : 0, lengthwise ? 0 : 2.4)
      Object.assign(layout[species][0], start, { waypoint: end })
      layout.patches.push({ ...center, angle, kind, stock: 1 })
      if (species === 'hares') layout.patches.push({ ...end, kind: 'clover', angle: 0, stock: 1 })
      const nav = habitatNavigation(layout.patches), sim = createBiome(recipe, layout)
      assert.equal(nav.clear(start, end), !detour)
      let maxLift = 0, deviation = 0, remaining = 5
      for (let i = 0; i < 150 && remaining > .48; i++) {
        const p = sim.seek(i / 10)[species][0]
        assert.ok(nav.open(p), species + ' entered ' + kind)
        maxLift = Math.max(maxLift, nav.lift(p))
        deviation = Math.max(deviation, Math.abs(p.x * start.z - p.z * start.x) / 2.4)
        remaining = Math.hypot(end.x - p.x, end.z - p.z)
        if (remaining <= .48) assert.equal(nav.lift(p), 0)
      }
      assert.ok(remaining <= .48, species + ' failed to reach the far side of ' + kind)
      if (detour) assert.ok(deviation > .3)
      else {
        assert.ok(deviation < .05)
        assert.ok(maxLift > .4, species + ' should clear the top of ' + kind)
      }
    }
  }
})
