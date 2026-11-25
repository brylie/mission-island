import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import { roadLayerEncoding } from '../src/assets/geometry/island-preview.ts'
import { roadNetwork } from '../src/assets/geometry/road-kinds.ts'
import { roadLayer } from '../src/assets/geometry/road-layer.ts'
import { terrainTile } from '../src/assets/geometry/starter-landscape.ts'
import { highwoodHeightmap } from '../src/assets/geometry/highwood-heightmap.ts'
import { decodeRoadLayer } from '../src/baked-roads.ts'
import { highwoodGraniteRocks } from '../src/highwood-outcrops.ts'
import { highwoodSolidTop } from '../src/highwood-solids.ts'
import { standingPlants } from '../src/highwood-standing.ts'
import { gradeRoadLayer, previewRoadLayouts, roadCulverts, roadDelta, roadFormation, roadLayoutKey, roadsBaked } from '../src/roads.ts'
import { islandRocks, islandTrees, northernRegionProps } from '../src/scenery.ts'
import { roadSources } from '../src/worlds/starter/generation/bake-sources.ts'
import { plantFits } from '../src/worlds/starter/highwood-clearings.ts'
import { highwoodPlanting } from '../src/worlds/starter/highwood-planting.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'

const live = gradeRoadLayer()
const baked = decodeRoadLayer(roadLayer)
const { tileCells, cellM } = roadNetwork
const tileM = tileCells * cellM
// A formation distance rounds to the nearest step, so it is off by at most half of one.
const formationTolerance = roadLayerEncoding.formationStepM / 2 + 1e-9
const tileOf = (key) => {
  const tx = Math.round(key / roadNetwork.tileKeyStride)
  return { tx, tz: key - tx * roadNetwork.tileKeyStride }
}

test('the baked road layer is up to date', () => {
  const hash = createHash('sha256')
  for (const path of roadSources) hash.update(path).update(readFileSync(new URL(`../${path}`, import.meta.url)))
  assert.equal(roadLayer.sourceHash, hash.digest('hex'), 'run npm run island:roads and commit the new bake')
  assert.equal(roadLayer.layoutKey, roadLayoutKey(starterRoads), 'the bake was made from the roads and heightmap in the source tree')
})

test('the baked grading raster is the live one, node for node and between nodes', () => {
  assert.deepEqual([...baked.raster.tiles.keys()].sort((a, b) => a - b), [...live.tiles.keys()].sort((a, b) => a - b))
  for (const [key, delta] of live.tiles) assert.deepEqual(baked.raster.tiles.get(key), delta)
  // Points between the nodes, in every tile and beside them, read the same heights.
  let checked = 0
  for (const key of live.tiles.keys()) {
    const { tx, tz } = tileOf(key)
    for (const [u, v] of [[0.13, 0.71], [0.5, 0.5], [0.97, 0.02], [1.04, 0.4], [-0.03, 0.9]]) {
      const point = { x: (tx + u) * tileM, z: (tz + v) * tileM }
      assert.equal(baked.raster.at(point), live.grading.delta(point), `raster at (${point.x}, ${point.z})`)
      assert.equal(baked.raster.near(point), live.grading.near(point))
      checked++
    }
  }
  assert.ok(checked > 500, `checked ${checked} points`)
  // The game's ground reads the bake.
  const point = { x: -310.4, z: 331.7 }
  assert.equal(roadDelta(point), live.grading.delta(point))
})

test('the baked culverts are the ones the live grading finds', () => {
  assert.ok(baked.culverts.length > 0)
  assert.deepEqual(baked.culverts, live.culverts)
  assert.deepEqual(roadCulverts(), live.culverts)
})

test('the baked formation distance matches the grading at every terrain vertex near a road', () => {
  // The generated terrain's vertices stand on whole metres from the heightmap's corner.
  assert.equal(terrainTile.cellM, cellM)
  assert.ok(Number.isInteger(highwoodHeightmap.west / cellM) && Number.isInteger(highwoodHeightmap.south / cellM))
  let near = 0
  for (const { tx, tz } of [...live.formationTiles.keys()].map(tileOf)) {
    // Every node of the tile, and a ring beyond it where no road is near.
    for (let j = -1; j <= tileCells + 1; j++) {
      for (let i = -1; i <= tileCells + 1; i++) {
        const point = { x: tx * tileM + i * cellM, z: tz * tileM + j * cellM }
        const want = live.formation(point), got = baked.formationAt(point)
        if (!Number.isFinite(want)) {
          assert.equal(got, Infinity, `formation at (${point.x}, ${point.z})`)
          continue
        }
        near++
        assert.ok(Math.abs(got - want) <= formationTolerance, `formation at (${point.x}, ${point.z}): baked ${got}, graded ${want}`)
        assert.ok(Math.abs(roadFormation(point) - want) <= formationTolerance)
      }
    }
  }
  assert.ok(near > 10_000, `${near} vertices near a road`)
  // Off the 1 m grid the bake has no answer, and the terrain asks the grading.
  const between = { x: -310.5, z: 331.25 }
  assert.equal(baked.formationAt(between), undefined)
  assert.equal(roadFormation(between), live.formation(between))
})

test('every baked plant fits the source tree\'s roads, and the forest, solids and rocks read the same list', () => {
  const plants = highwoodPlanting()
  assert.equal(plants.filter((plant) => !plantFits(plant, plant.layer)).length, 0)
  assert.ok(roadsBaked())
  assert.equal(standingPlants(), plants, 'with the source tree\'s roads the baked list stands as it is')
  // Roads graded live, even the same roads (as just after a save, before the bake), are checked again.
  try {
    previewRoadLayouts([...starterRoads])
    assert.ok(!roadsBaked())
    assert.notEqual(standingPlants(), plants)
    assert.equal(standingPlants().length, plants.length)
  }
  finally {
    previewRoadLayouts(starterRoads)
  }
  assert.ok(roadsBaked())
})

test('previewing a draft road clears its trees, solids and rocks, and the source tree\'s roads bring them back', () => {
  const trunk = highwoodPlanting().find((plant) => plant.layer === 'canopy' && highwoodSolidTop(plant, 0) > -Infinity)
  assert.ok(trunk, 'a solid canopy tree to lay a road through')
  const draft = { id: 'draft-test', name: 'Draft test road', kind: 'fire-road', points: [{ x: trunk.x - 40, z: trunk.z }, { x: trunk.x + 40, z: trunk.z }], bends: [0] }
  const rocks = highwoodGraniteRocks(), trees = islandTrees(), stones = islandRocks(), northern = northernRegionProps()
  try {
    previewRoadLayouts([...starterRoads, draft])
    assert.ok(!standingPlants().includes(trunk), 'the tree on the draft road no longer stands')
    assert.ok(!plantFits(trunk, trunk.layer))
    assert.equal(highwoodSolidTop(trunk, 0), -Infinity, 'nor is it solid')
    assert.notEqual(highwoodGraniteRocks(), rocks, 'the granite outcrops are placed again')
    assert.notEqual(islandTrees(), trees, 'the old island\'s trees are placed again')
    assert.notEqual(islandRocks(), stones)
    assert.notEqual(northernRegionProps(), northern, 'and the northern regions\' props')
    assert.notEqual(roadDelta(trunk), 0, 'the draft road is graded live')
  }
  finally {
    previewRoadLayouts(starterRoads)
  }
  assert.equal(standingPlants(), highwoodPlanting())
  assert.ok(highwoodSolidTop(trunk, 0) > -Infinity)
  assert.equal(roadDelta(trunk), baked.raster.at(trunk), 'the source tree\'s roads read the bake again')
  assert.deepEqual(highwoodGraniteRocks(), rocks)
  assert.deepEqual(northernRegionProps(), northern)
})
