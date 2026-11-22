import assert from 'node:assert/strict'
import test from 'node:test'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js'
import { generateTreeGeometry, templateBudget } from '../src/assets/trees/tree-geometry.ts'
import { addFrond, addPad, addTube, emptyMesh } from '../src/assets/trees/tree-mesh.ts'
import { treeCollision } from '../src/assets/trees/tree-collision.ts'
import { treeAges, treeExposures, treeSpecies, treeSpeciesIds, treeTiers } from '../src/assets/trees/tree-catalog.ts'

const seeds = Array.from({ length: 12 }, (_, i) => i + 1)
const every = treeSpeciesIds.flatMap((species) => treeAges.flatMap((age) => treeExposures.flatMap((exposure) =>
  treeTiers.map((tier) => ({ species, age, exposure, tier })))))

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], positions[i])
    max[i % 3] = Math.max(max[i % 3], positions[i])
  }
  return { min, max }
}
const allPositions = (geometry) => [...geometry.bark.positions, ...geometry.foliage.positions]

test('every species and shrub builds at both ages, exposures and tiers', () => {
  for (const options of every) {
    const label = JSON.stringify(options)
    const geometry = generateTreeGeometry({ ...options, seed: 1 })
    assert.ok(geometry.triangles > 0, label)
    for (const part of [geometry.bark, geometry.foliage]) {
      const vertices = part.positions.length / 3
      assert.equal(part.normals.length, part.positions.length, label)
      assert.equal(part.uvs.length, vertices * 2, label)
      assert.equal(part.colors.length, vertices * 4, label)
      assert.ok(part.positions.every(Number.isFinite) && part.colors.every(Number.isFinite), label)
      assert.ok(part.indices.every((index) => index >= 0 && index < vertices), label)
    }
    const { collision } = geometry
    assert.ok(collision.radius > 0, label)
    assert.ok((collision.shape === 'upright' ? collision.height : collision.length) > 0, label)
  }
})

test('living trees carry foliage and deadwood carries none', () => {
  for (const species of treeSpeciesIds) {
    const geometry = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 1, tier: 'near' })
    const habit = treeSpecies[species].habit
    assert.equal(geometry.foliage.indices.length > 0, habit !== 'snag' && habit !== 'log', species)
  }
})

test('the same seed always grows identical geometry', () => {
  for (const options of every) {
    const first = generateTreeGeometry({ ...options, seed: 7 })
    const again = generateTreeGeometry({ ...options, seed: 7 })
    assert.deepEqual(again, first, JSON.stringify(options))
  }
})

test('neighbouring seeds grow different members of the same species', () => {
  for (const species of treeSpeciesIds) {
    const options = { species, age: 'mature', exposure: 'sheltered', tier: 'near' }
    const shapes = seeds.slice(0, 4).map((seed) => allPositions(generateTreeGeometry({ ...options, seed })))
    for (let i = 1; i < shapes.length; i++) assert.notDeepEqual(shapes[i], shapes[0], `${species} seed ${i + 1}`)
    const form = treeSpecies[species]
    if (form.habit !== 'tree') continue
    for (const seed of seeds) {
      const { collision } = generateTreeGeometry({ ...options, seed })
      const [low, high] = form.height.mature
      assert.ok(collision.height >= low && collision.height <= high, `${species} seed ${seed} height ${collision.height}`)
    }
  }
})

test('both tiers stay inside their triangle budgets across seeds', () => {
  for (const options of every) for (const seed of seeds) {
    const geometry = generateTreeGeometry({ ...options, seed })
    const [low, high] = templateBudget(geometry, options.tier)
    assert.ok(geometry.triangles >= low && geometry.triangles <= high, `${JSON.stringify({ ...options, seed })}: ${geometry.triangles} outside ${low}–${high}`)
  }
})

test('trees keep their budgets at the stated near and far ranges', () => {
  const trees = treeSpeciesIds.filter((species) => treeSpecies[species].habit === 'tree' && treeSpecies[species].budget === 'tree')
  assert.deepEqual(trees, ['scots-pine', 'birch', 'aspen', 'rowan', 'alder', 'willow'])
  for (const species of trees) {
    const near = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 1, tier: 'near' })
    assert.deepEqual([...templateBudget(near, 'near')], [600, 1500])
    assert.deepEqual([...templateBudget(near, 'far')], [60, 160])
  }
})

function agreement(part) {
  const computed = []
  VertexData.ComputeNormals(part.positions, part.indices, computed)
  let agree = 0
  for (let i = 0; i < part.normals.length; i += 3) {
    if (computed[i] * part.normals[i] + computed[i + 1] * part.normals[i + 1] + computed[i + 2] * part.normals[i + 2] > 0) agree++
  }
  return agree / (part.normals.length / 3)
}

test('primitives wind the way Babylon expects, so back-face culling keeps the outside', () => {
  const white = () => [1, 1, 1]
  const tube = emptyMesh()
  addTube(tube, [{ point: [0, 0, 0], radius: 1 }, { point: [0, 1, 0], radius: 0.8 }, { point: [0.4, 2, 0.2], radius: 0.4 }], { sides: 6, color: white, cap: { rise: () => 0.3, color: [1, 1, 1] } })
  const lying = emptyMesh()
  addTube(lying, [{ point: [0, 0, 0], radius: 0.3 }, { point: [3, 0.1, 0], radius: 0.25 }], { sides: 5, color: white })
  const pads = emptyMesh()
  for (const rings of [1, 2, 3]) addPad(pads, { center: [rings * 3, 0, 0], radius: [1, 0.6, 1.2], segments: 6, rings, flatten: 0.5, jitter: () => 0, color: white })
  const frond = emptyMesh()
  addFrond(frond, [{ point: [0, 0, 0], width: 0.05 }, { point: [0.2, 0.8, 0], width: 0.5 }, { point: [0.8, 1, 0.1], width: 0.2 }], [0, 0, 1], white)
  for (const [name, mesh] of Object.entries({ tube, lying, pads, frond })) assert.equal(agreement(mesh), 1, name)
})

test('every template is faceted, with each face lit by its own outward normal', () => {
  for (const options of every) {
    const { bark, foliage } = generateTreeGeometry({ ...options, seed: 3 })
    for (const part of [bark, foliage]) {
      if (!part.indices.length) continue
      assert.equal(part.positions.length / 3, part.indices.length, `${JSON.stringify(options)} shares no corners`)
      assert.equal(agreement(part), 1, JSON.stringify(options))
    }
  }
})

test('tree crowns hold three to nine clumps, and old trees lose their top', () => {
  for (const species of treeSpeciesIds.filter((id) => treeSpecies[id].habit === 'tree')) {
    for (const age of treeAges) for (const seed of seeds) {
      const { clumps } = generateTreeGeometry({ species, age, exposure: 'sheltered', seed, tier: 'near' })
      assert.ok(clumps >= 3 && clumps <= 9, `${species} ${age} seed ${seed}: ${clumps} clumps`)
    }
    if (treeSpecies[species].budget !== 'tree') continue
    const mature = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 6, tier: 'near' })
    const old = generateTreeGeometry({ species, age: 'old', exposure: 'sheltered', seed: 6, tier: 'near' })
    assert.ok(old.collision.radius > mature.collision.radius, `${species} old trunks are stouter`)
  }
})

test('shrubs and groundcover sit flush on the ground', () => {
  for (const species of ['juniper', 'heather', 'bilberry', 'bracken']) for (const options of every.filter((o) => o.species === species)) {
    const { foliage } = generateTreeGeometry({ ...options, seed: 2 })
    const { min } = bounds(foliage.positions)
    assert.ok(min[1] > -0.05 && min[1] < 0.03, `${JSON.stringify(options)} base at ${min[1]}`)
  }
})

test('templates carry pivots for a later sway pass', () => {
  for (const species of treeSpeciesIds) {
    const { sway, collision } = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 1, tier: 'near' })
    assert.deepEqual(sway.trunkBase, [0, 0, 0])
    assert.ok(sway.height > 0 && sway.crownCenter.every(Number.isFinite), species)
    if (collision.shape === 'upright') assert.ok(sway.crownCenter[1] > 0 && sway.crownCenter[1] <= collision.height * 1.2, species)
  }
})

test('exposed trees lean and stream toward +x, sheltered trees stand nearly upright', () => {
  for (const species of ['scots-pine', 'birch', 'rowan', 'pine-snag']) {
    const lean = (exposure) => {
      const { bark } = generateTreeGeometry({ species, age: 'mature', exposure, seed: 2, tier: 'near' })
      const { min, max } = bounds(bark.positions)
      const top = []
      for (let i = 0; i < bark.positions.length; i += 3) if (bark.positions[i + 1] > min[1] + (max[1] - min[1]) * 0.85) top.push(bark.positions[i])
      return top.reduce((sum, x) => sum + x, 0) / top.length
    }
    assert.ok(lean('exposed') > lean('sheltered') + 0.3, `${species} leans downwind`)
  }
})

test('templates stand on their origin, with the trunk running a little below ground', () => {
  for (const species of treeSpeciesIds) {
    const geometry = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 4, tier: 'near' })
    const { min, max } = bounds(allPositions(geometry))
    assert.ok(min[1] < 0.01 && min[1] > -1, `${species} base at ${min[1]}`)
    assert.ok(Math.abs((min[0] + max[0]) / 2) < Math.max(1, max[0] - min[0]), `${species} centred near the origin`)
  }
})

test('the far silhouette keeps the near model’s height and spread', () => {
  for (const species of treeSpeciesIds) for (const exposure of treeExposures) {
    const options = { species, age: 'mature', exposure, seed: 5 }
    const near = bounds(allPositions(generateTreeGeometry({ ...options, tier: 'near' })))
    const far = bounds(allPositions(generateTreeGeometry({ ...options, tier: 'far' })))
    const height = (b) => b.max[1], width = (b) => Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2])
    assert.ok(Math.abs(height(far) - height(near)) / height(near) < 0.15, `${species} ${exposure} height ${height(far)} vs ${height(near)}`)
    assert.ok(Math.abs(width(far) - width(near)) / width(near) < 0.3, `${species} ${exposure} spread ${width(far)} vs ${width(near)}`)
  }
})

test('collision comes from the seed alone and matches the grown template', () => {
  for (const options of every) for (const seed of [1, 9]) {
    const geometry = generateTreeGeometry({ ...options, seed })
    assert.deepEqual(treeCollision({ ...options, seed }), geometry.collision, JSON.stringify({ ...options, seed }))
  }
  const solid = (species) => treeCollision({ species, age: 'mature', exposure: 'sheltered', seed: 1, tier: 'near' }).solid
  for (const species of ['scots-pine', 'birch', 'alder', 'pine-snag', 'deadfall-log']) assert.equal(solid(species), true, species)
  for (const species of ['juniper', 'heather', 'bilberry', 'bracken']) assert.equal(solid(species), false, species)
})

test('vertex alpha carries a sway weight from the ground to the top', () => {
  for (const species of treeSpeciesIds) {
    const { bark, foliage, crownRadius } = generateTreeGeometry({ species, age: 'mature', exposure: 'sheltered', seed: 2, tier: 'near' })
    assert.ok(crownRadius > 0, species)
    for (const part of [bark, foliage]) for (let i = 0; i < part.colors.length; i += 4) {
      const weight = part.colors[i + 3], y = part.positions[(i / 4) * 3 + 1]
      assert.ok(weight >= 0 && weight <= 1, `${species} weight ${weight}`)
      if (y <= 0) assert.equal(weight, 0, `${species} rooted vertices stay still`)
    }
  }
})

test('a pinned template keeps its shape, so placed trees never reroll unnoticed', () => {
  const geometry = generateTreeGeometry({ species: 'scots-pine', age: 'mature', exposure: 'sheltered', seed: 1, tier: 'near' })
  assert.equal(geometry.triangles, 978)
  assert.deepEqual(geometry.foliage.positions.slice(0, 3).map((value) => Number(value.toFixed(4))), [2.3209, 8.2428, 0.8778])
  assert.equal(Number(geometry.collision.height.toFixed(4)), 11.6624)
  // Seeds are whole numbers: a fraction grows the same tree as its integer part.
  assert.deepEqual(generateTreeGeometry({ species: 'birch', age: 'young', exposure: 'exposed', seed: 4.6, tier: 'far' }), generateTreeGeometry({ species: 'birch', age: 'young', exposure: 'exposed', seed: 4, tier: 'far' }))
})
